/**
 * Online ordering ON/OFF switch (admin panel → settings/ordering).
 *
 * OFF blocks every way of starting an order: quoteCheckout() is the entry point
 * for both the quote and the PaymentIntent, so one gate there covers the API.
 * Payments that already succeeded are still honoured (finalizeCheckout is not gated).
 * The website reads the same doc live via Firestore (public read in firestore.rules).
 */
const stripe = require("../config/stripe.config");
const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { AppError } = require("../utils/errors.util");

const ref = () => db.collection("settings").doc("ordering");

const getOrdering = async () => {
  const snap = await ref().get();
  const d = snap.exists ? snap.data() : {};
  return { open: d.open !== false, updatedAt: d.updatedAt ?? null, updatedBy: d.updatedBy ?? null };
};

/** Pure check — throws 503 ORDERS_PAUSED when ordering is off. */
const checkOpen = (state) => {
  if (state.open === false) {
    throw new AppError("We're not taking online orders right now. Please try again later.", 503, "ORDERS_PAUSED");
  }
};

const assertOrderingOpen = async () => checkOpen(await getOrdering());

/**
 * Cancel every unpaid PaymentIntent so a checkout tab left open from before the
 * switch can't be paid later. Already-succeeded ones fail to cancel → honoured.
 */
const cancelAwaitingPayments = async () => {
  const pending = await db.collection(COLLECTION_NAMES.CHECKOUTS).where("status", "==", "awaiting_payment").get();
  const results = await Promise.allSettled(pending.docs.map(async (doc) => {
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
  console.log(`[ordering] paused — cancelled ${cancelled}/${pending.size} unpaid checkouts`);
};

const setOrdering = async (open, adminId) => {
  const state = { open, updatedAt: new Date().toISOString(), updatedBy: adminId ?? null };
  await ref().set(state, { merge: true });
  console.log(`[ordering] online ordering ${open ? "ON" : "OFF"} (by ${adminId})`);
  if (!open) cancelAwaitingPayments().catch((err) => console.error("[ordering] cancel sweep failed:", err.message));
  return state;
};

module.exports = { getOrdering, checkOpen, assertOrderingOpen, setOrdering, cancelAwaitingPayments };
