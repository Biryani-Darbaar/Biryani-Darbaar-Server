/**
 * Online ordering switches (admin panel → settings/ordering):
 *   open      – master switch: OFF blocks every new order
 *   pickup    – pickup orders allowed
 *   delivery  – delivery orders allowed
 *   autoClosed – true when `open` was turned off because pickup AND delivery were both switched off
 * Missing fields mean ON (a missing doc = everything open).
 *
 * quoteCheckout() is the entry point for both the quote and the PaymentIntent, so one
 * gate there covers the API. Payments that already succeeded are still honoured
 * (finalizeCheckout is not gated). The website reads the same doc live via Firestore
 * (public read in firestore.rules).
 */
const stripe = require("../config/stripe.config");
const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { AppError } = require("../utils/errors.util");

const ref = () => db.collection("settings").doc("ordering");
const METHODS = ["pickup", "delivery"];
const LABEL = { pickup: "Pickup", delivery: "Delivery" };

const normalise = (d = {}) => ({
  open: d.open !== false,
  pickup: d.pickup !== false,
  delivery: d.delivery !== false,
  autoClosed: d.autoClosed === true,
  updatedAt: d.updatedAt ?? null,
  updatedBy: d.updatedBy ?? null,
});

const getOrdering = async () => {
  const snap = await ref().get();
  return normalise(snap.exists ? snap.data() : {});
};

/**
 * Pure: next switch state for an admin change `patch` ({ open?, pickup?, delivery? }).
 * - Both methods off → ordering off (autoClosed, unless it was already off on purpose).
 * - A method back on → ordering back on, but only if it was autoClosed.
 * - Ordering ON while both methods are off → both methods back on.
 */
const applyChange = (current, patch) => {
  const next = { ...normalise(current) };
  for (const m of METHODS) if (typeof patch[m] === "boolean") next[m] = patch[m];

  if (!next.pickup && !next.delivery) {
    if (next.open) { next.open = false; next.autoClosed = true; }
  } else if (!next.open && next.autoClosed && METHODS.some((m) => patch[m] === true)) {
    next.open = true;
    next.autoClosed = false;
  }

  if (patch.open === true) {
    next.open = true;
    next.autoClosed = false;
    if (!next.pickup && !next.delivery) { next.pickup = true; next.delivery = true; }
  } else if (patch.open === false) {
    next.open = false;
    next.autoClosed = false;
  }
  return next;
};

/** Pure check — throws 503 when ordering (or the chosen pickup/delivery method) is off. */
const checkOpen = (state, shippingMethod) => {
  const s = normalise(state);
  if (!s.open) {
    throw new AppError("We're not taking online orders right now. Please try again later.", 503, "ORDERS_PAUSED");
  }
  if (shippingMethod && s[shippingMethod] === false) {
    const other = shippingMethod === "pickup" ? "delivery" : "pickup";
    throw new AppError(`${LABEL[shippingMethod]} isn't available right now. Please choose ${other} instead.`, 503, "SHIPPING_METHOD_PAUSED");
  }
};

const assertOrderingOpen = async (shippingMethod) => checkOpen(await getOrdering(), shippingMethod);

/**
 * Cancel unpaid PaymentIntents (all of them, or only one shipping method) so a checkout
 * tab left open from before the switch can't be paid later. Already-succeeded ones
 * fail to cancel → honoured.
 */
const cancelAwaitingPayments = async (shippingMethod) => {
  const pending = await db.collection(COLLECTION_NAMES.CHECKOUTS).where("status", "==", "awaiting_payment").get();
  const docs = shippingMethod ? pending.docs.filter((d) => d.data().quote?.shippingMethod === shippingMethod) : pending.docs;
  const results = await Promise.allSettled(docs.map(async (doc) => {
    try {
      await stripe.paymentIntents.cancel(doc.id);
    } catch (err) {
      // Expected: already paid/processing (honoured — finalize handles it), or a
      // PaymentIntent from the other Stripe mode (test vs live) sharing this DB.
      if (!["payment_intent_unexpected_state", "resource_missing"].includes(err?.raw?.code)) {
        console.warn(`[ordering] could not cancel ${doc.id}:`, err.message);
      }
      throw err;
    }
    await doc.ref.update({ status: "cancelled_paused", cancelledAt: new Date().toISOString() });
  }));
  const cancelled = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[ordering] ${shippingMethod || "all"} paused — cancelled ${cancelled}/${docs.length} unpaid checkouts`);
};

const setOrdering = async (patch, adminId) => {
  const before = await getOrdering();
  const next = applyChange(before, patch);
  const state = {
    open: next.open, pickup: next.pickup, delivery: next.delivery, autoClosed: next.autoClosed,
    updatedAt: new Date().toISOString(), updatedBy: adminId ?? null,
  };
  await ref().set(state, { merge: true });
  console.log(`[ordering] open=${state.open} pickup=${state.pickup} delivery=${state.delivery} (by ${adminId})`);

  const sweep = (m) => cancelAwaitingPayments(m).catch((err) => console.error("[ordering] cancel sweep failed:", err.message));
  if (before.open && !state.open) sweep();
  else if (state.open) METHODS.filter((m) => before[m] && !state[m]).forEach(sweep);
  return state;
};

module.exports = { getOrdering, applyChange, checkOpen, assertOrderingOpen, setOrdering, cancelAwaitingPayments };
