/**
 * Metrics ERP POS integration — pushes every paid online order to the POS.
 *
 * Flow per order:  POST {POS_BASE_URL}/sign-in  → idToken
 *                  POST {POS_BASE_URL}/save-pos-order  (Authorization: <idToken>, no "Bearer")
 *
 * Sync state lives on the order document (both copies) as `posSync`:
 *   { status: "pending" | "synced" | "failed", attempts, posOrderId, lastError, lastAttemptAt, syncedAt }
 */
const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");

const POS_TIMEOUT_MS = 10_000;
const ITEM_TAXRAW    = "5||GST-10%||10||0"; // from the ERP item export — all items are 10% GST
const GST_RATE       = 0.1;

const isEnabled = () => process.env.POS_ENABLED === "true";

const round2 = (n) => Math.round(n * 100) / 100;

/** Normalise an AU mobile to the 04XXXXXXXX format the POS expects. */
const normalisePhone = (raw = "") => {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("614") && digits.length === 11) return "0" + digits.slice(2);
  return digits;
};

/**
 * Build the save-pos-order body from a stored order + its user.
 * Prices are the item list prices (before promo/coin discounts). They are
 * GST-inclusive, so per unit: tax = price × 10%, unit price = price − tax.
 */
const buildPosPayload = (order, user) => {
  const cartItems = {};
  const taxArray  = {};
  let subtotal = 0;
  let totalTax = 0;

  (order.orderItems || []).forEach((item, idx) => {
    const id       = String(item.posItemId);
    const qty      = Number(item.quantity) || 0;
    const unitTax  = round2(Number(item.price) * GST_RATE);
    const unitEx   = round2(Number(item.price) - unitTax);
    const lineEx   = round2(unitEx * qty);
    const lineTax  = round2(unitTax * qty);

    // The ERP keys cartItems by item_id — merge if two lines share one POS item
    const prev = cartItems[id];
    const quantity = (prev ? Number(prev.quantity) : 0) + qty;
    const lineTotal = round2((prev ? Number(prev.item_total) : 0) + lineEx);
    cartItems[id] = {
      item_id:      id,
      item_name:    item.posItemName,
      price:        String(unitEx),
      quantity:     String(quantity),
      item_image:   "",
      item_total:   String(lineTotal),
      item_taxable: "0",
      item_taxraw:  ITEM_TAXRAW,
      item_uom:     "1",
      // Order-level instructions ride on the first item so they print once
      instruction:  prev ? prev.instruction : (idx === 0 ? (order.instructions || "") : ""),
    };
    taxArray[id] = {
      item_id:   id,
      total_tax: String(round2((prev ? Number(taxArray[id].total_tax) : 0) + lineTax)),
    };
    subtotal += lineEx;
    totalTax += lineTax;
  });

  return {
    first_name:          user.firstName || "",
    last_name:           user.lastName || "",
    customer_phone:      normalisePhone(order.phoneNumber || user.phoneNumber),
    email:               user.email || "",
    till_no:             "1",
    address:             "",
    selected_lng:        0,
    selected_lat:        0,
    order_type:          "1",
    subtotal_value:      round2(subtotal),
    cartItems,
    total_tax_value:     String(round2(totalTax)),
    taxArray:            JSON.stringify(taxArray),
    delivery_charge:     0,
    delivery_charge_tax: 0,
    delivery_tax_raw:    0,
    bcc_email:           "",
    org_id:              Number(process.env.POS_ORG_ID || 1),
  };
};

const postJson = async (path, body, token) => {
  const res = await fetch(`${process.env.POS_BASE_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: token }) },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(POS_TIMEOUT_MS),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`POS ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`); }
};

const signIn = async () => {
  const json = await postJson("/sign-in", {
    username: process.env.POS_USERNAME,
    password: process.env.POS_PASSWORD,
    uuid:     process.env.POS_UUID,
  });
  const token = json?.response?.idToken;
  if (json?.statusCode !== 200 || !token) {
    throw new Error(`POS sign-in failed: ${typeof json?.response === "string" ? json.response : JSON.stringify(json).slice(0, 200)}`);
  }
  return token;
};

const savePosOrder = async (payload) => {
  const token = await signIn();
  const json  = await postJson("/save-pos-order", payload, token);
  if (json?.status !== "Success") {
    throw new Error(`POS order rejected: ${json?.message || JSON.stringify(json).slice(0, 200)}`);
  }
  return json.data; // ERP order number
};

// ── Order-level sync with state tracking ─────────────────────────────────────

const inFlight = new Set(); // ponytail: in-process guard, fine for the single PM2 instance

const writePosSync = async (order, posSync) => {
  const refs = [db.collection(COLLECTION_NAMES.ORDER).doc(order.id)];
  if (order.userId) {
    refs.push(db.collection(COLLECTION_NAMES.USERS).doc(order.userId)
      .collection(COLLECTION_NAMES.ORDERS).doc(order.id));
  }
  await Promise.all(refs.map((r) => r.set({ posSync }, { merge: true })));
};

/**
 * Push one order to the POS, retrying up to `attempts` times.
 * Never throws — returns the resulting posSync object (or a status-only object
 * when sync is disabled / already done / already running).
 */
const syncOrderToPos = async (orderId, { attempts = 1 } = {}) => {
  if (!isEnabled()) return { status: "disabled" };
  if (inFlight.has(orderId)) return { status: "in_progress" };
  inFlight.add(orderId);

  try {
    const snap = await db.collection(COLLECTION_NAMES.ORDER).doc(orderId).get();
    if (!snap.exists) return { status: "failed", lastError: "Order not found" };
    const order = { id: snap.id, ...snap.data() };
    if (order.posSync?.status === "synced") return order.posSync; // never double-send

    const userSnap = await db.collection(COLLECTION_NAMES.USERS).doc(order.userId).get();
    const user = userSnap.exists ? userSnap.data() : {};

    let posSync = { ...(order.posSync || {}), attempts: order.posSync?.attempts || 0 };

    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 2000 * i));
      posSync.attempts += 1;
      posSync.lastAttemptAt = new Date().toISOString();
      try {
        const missing = (order.orderItems || []).filter((it) => !it.posItemId || !it.posItemName);
        if (missing.length) {
          throw new Error(`Not linked to POS: ${missing.map((m) => m.name).join(", ")}`);
        }
        const posOrderId = await savePosOrder(buildPosPayload(order, user));
        posSync = { ...posSync, status: "synced", posOrderId, lastError: null, syncedAt: new Date().toISOString() };
        break;
      } catch (err) {
        posSync = { ...posSync, status: "failed", lastError: err.message };
        console.error(`[POS] order ${orderId} attempt ${posSync.attempts} failed:`, err.message);
      }
    }

    await writePosSync(order, posSync);
    if (posSync.status === "synced") console.log(`[POS] order ${orderId} → POS #${posSync.posOrderId}`);
    return posSync;
  } catch (err) {
    console.error(`[POS] sync crashed for ${orderId}:`, err);
    return { status: "failed", lastError: err.message };
  } finally {
    inFlight.delete(orderId);
  }
};

module.exports = { isEnabled, buildPosPayload, normalisePhone, syncOrderToPos };
