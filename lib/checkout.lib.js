/**
 * Checkout & payment — the server is the single authority on what an order
 * costs and on whether it was paid.
 *
 *   1. quoteCheckout()          price the cart from live data (no trust in the client)
 *   2. createCheckoutPayment()  Stripe PaymentIntent for exactly the quoted amount,
 *                               with the quote saved under checkouts/{paymentIntentId}
 *   3. finalizeCheckout()       only after Stripe reports the PaymentIntent succeeded:
 *                               creates the order (once — safe to call repeatedly,
 *                               from the browser and from the Stripe webhook),
 *                               deducts coins, then hands the order to the POS.
 *
 * No succeeded payment → no order → no POS call.
 */
const stripe = require("../config/stripe.config");
const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { ValidationError, PaymentError, NotFoundError, AuthorizationError } = require("../utils/errors.util");
const { calculateRewards } = require("../utils/calculations.util");
const pos = require("./pos.lib");

const RESTAURANT = { lat: -34.858247, lng: 138.54698 }; // 183 Hanson Rd, Athol Park
const MAX_DELIVERY_KM = 25;
const DELIVERY_TIERS = [
  { maxKm: 5, fee: 10 },
  { maxKm: 10, fee: 15 },
  { maxKm: 15, fee: 20 },
  { maxKm: 20, fee: 25 },
  { maxKm: 25, fee: 30 },
];
const MIN_ORDER = 25;
const MIN_COINS_TO_REDEEM = 50;
const COIN_TO_AUD = 0.1;
const STRIPE_MIN = 0.5;

const round2 = (n) => Math.round(n * 100) / 100;
const toCents = (n) => Math.round(n * 100);

const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Price a cart. `input` = { items: [{ dishId, quantity, cartItemId? }],
 *   shippingMethod: "delivery"|"pickup", address?: { lat, lng }, promoCode?, coinsToUse? }
 * Throws ValidationError with a customer-readable message when the cart can't be ordered.
 */
const quoteCheckout = async (userId, input = {}) => {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new ValidationError("Your cart is empty");

  const [userSnap, dishSnap] = await Promise.all([
    db.collection(COLLECTION_NAMES.USERS).doc(userId).get(),
    // ponytail: reads the whole menu (~50 dishes); fine at this size
    db.collectionGroup(COLLECTION_NAMES.DISHES).get(),
  ]);
  if (!userSnap.exists) throw new NotFoundError("User");
  const user = userSnap.data();
  const dishById = new Map(dishSnap.docs.map((d) => [d.id, d.data()]));

  const lines = items.map((it) => {
    const dish = dishById.get(it.dishId);
    const qty = Number(it.quantity);
    if (!dish || dish.available === false) {
      throw new ValidationError(`An item in your cart is no longer available. Please remove it and try again.`);
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
      throw new ValidationError("Invalid quantity in cart");
    }
    const unit = Number(user.goldMember === true ? dish.goldPrice ?? dish.price : dish.price);
    return {
      cartItemId: it.cartItemId ?? null,
      dishId: it.dishId,
      name: dish.dishName ?? dish.name,
      quantity: qty,
      price: unit,
      posItemId: dish.posItemId ?? null,
      posItemName: dish.posItemName ?? null,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  if (subtotal < MIN_ORDER) {
    throw new ValidationError(`Minimum order is $${MIN_ORDER}. Add $${(MIN_ORDER - subtotal).toFixed(2)} more to continue.`);
  }

  // Delivery fee from distance (pickup is free)
  const shippingMethod = input.shippingMethod === "pickup" ? "pickup" : "delivery";
  let deliveryFee = 0;
  let distanceKm = null;
  if (shippingMethod === "delivery") {
    const lat = Number(input.address?.lat);
    const lng = Number(input.address?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ValidationError("Please choose a delivery address from the suggestions");
    }
    distanceKm = round2(haversineKm(RESTAURANT, { lat, lng }));
    if (distanceKm > MAX_DELIVERY_KM) {
      throw new ValidationError(`We deliver within ${MAX_DELIVERY_KM} km. Please choose a closer address or pickup.`);
    }
    deliveryFee = DELIVERY_TIERS.find((t) => distanceKm <= t.maxKm).fee;
  }

  // Promo code (percentage off the food subtotal)
  let promoCode = null;
  let promoDiscount = 0;
  if (input.promoCode) {
    const promoSnap = await db.collection(COLLECTION_NAMES.PROMO_CODES).doc(String(input.promoCode)).get();
    const promo = promoSnap.exists ? promoSnap.data() : null;
    const expiresMs = promo?.expirationDate?.toMillis?.() ?? (promo?.expirationDate?._seconds ?? 0) * 1000;
    if (!promo || expiresMs < Date.now()) {
      throw new ValidationError("That promo code is invalid or has expired");
    }
    promoCode = String(input.promoCode);
    promoDiscount = round2(subtotal * Math.min(1, Math.max(0, Number(promo.discount) || 0)));
  }

  // Wallet coins
  const coinsToUse = Number(input.coinsToUse) || 0;
  let coinsUsed = 0;
  let coinDiscount = 0;
  if (coinsToUse > 0) {
    const balance = user.walletBalance ?? 0;
    const maxUsable = Math.min(balance, Math.floor((subtotal - promoDiscount + deliveryFee) / COIN_TO_AUD));
    if (!Number.isInteger(coinsToUse) || coinsToUse < MIN_COINS_TO_REDEEM) {
      throw new ValidationError(`A minimum of ${MIN_COINS_TO_REDEEM} coins is needed to redeem`);
    }
    if (coinsToUse > maxUsable) {
      throw new ValidationError(`You can use up to ${maxUsable} coins on this order`);
    }
    coinsUsed = coinsToUse;
    coinDiscount = round2(coinsUsed * COIN_TO_AUD);
  }

  const total = round2(Math.max(0, subtotal - promoDiscount - coinDiscount + deliveryFee));
  if (total < STRIPE_MIN) {
    throw new ValidationError(`The order total must be at least $${STRIPE_MIN.toFixed(2)}`);
  }

  return { items: lines, subtotal, shippingMethod, distanceKm, deliveryFee, promoCode, promoDiscount, coinsUsed, coinDiscount, total };
};

/**
 * Quote the cart and create a Stripe PaymentIntent for exactly that amount.
 * `input` additionally carries { phoneNumber, instructions, address: { label, lat, lng } }.
 */
const createCheckoutPayment = async (userId, input = {}) => {
  const phone = pos.normalisePhone(input.phoneNumber || "");
  if (!/^04\d{8}$/.test(phone)) {
    throw new ValidationError("Please enter a valid Australian mobile number (04XX XXX XXX)");
  }
  const quote = await quoteCheckout(userId, input);
  const userSnap = await db.collection(COLLECTION_NAMES.USERS).doc(userId).get();
  const user = userSnap.data();

  const intent = await stripe.paymentIntents.create({
    amount: toCents(quote.total),
    currency: "aud",
    description: "Biryani Darbaar online order",
    receipt_email: user.email || undefined,
    metadata: { userId, source: "website" },
  });

  await db.collection(COLLECTION_NAMES.CHECKOUTS).doc(intent.id).set({
    userId,
    status: "awaiting_payment",
    amountCents: toCents(quote.total),
    quote,
    customer: {
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      phoneNumber: phone,
      address: quote.shippingMethod === "pickup" ? "Pickup" : String(input.address?.label || "").slice(0, 300),
    },
    instructions: String(input.instructions || "").trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  });

  return { clientSecret: intent.client_secret, paymentIntentId: intent.id, quote };
};

/**
 * Turn a SUCCEEDED PaymentIntent into an order. Idempotent: the first call
 * creates the order, later calls (browser retry, Stripe webhook) return it.
 * `expectedUserId` is enforced when the caller is a logged-in customer.
 */
const finalizeCheckout = async (paymentIntentId, { expectedUserId } = {}) => {
  if (!paymentIntentId) throw new ValidationError("paymentIntentId is required");

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded") {
    throw new PaymentError(`Payment has not completed (status: ${intent.status}). No order was created.`);
  }
  if (expectedUserId && intent.metadata?.userId !== expectedUserId) {
    throw new AuthorizationError("This payment belongs to a different account");
  }

  const checkoutRef = db.collection(COLLECTION_NAMES.CHECKOUTS).doc(paymentIntentId);
  const firstLook = await checkoutRef.get();
  if (!firstLook.exists) throw new NotFoundError("Checkout for this payment");
  const checkout = firstLook.data();
  if (intent.amount_received !== checkout.amountCents || intent.currency !== "aud") {
    // Should be impossible (we set the amount), but never create an order for a mismatched charge
    throw new PaymentError("Payment amount does not match the order. Please contact us.");
  }

  const userId = checkout.userId;
  const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
  const orderId = checkoutRef.id.replace(/^pi_/, "ord_"); // stable id → a retry can never create a twin
  const globalRef = db.collection(COLLECTION_NAMES.ORDER).doc(orderId);
  const userOrderRef = userRef.collection(COLLECTION_NAMES.ORDERS).doc(orderId);

  let created = false;
  let order;
  await db.runTransaction(async (tx) => {
    const [ck, userSnap] = await Promise.all([tx.get(checkoutRef), tx.get(userRef)]);
    if (ck.data().orderId) {
      order = { id: ck.data().orderId };
      return;
    }
    const { quote, customer, instructions } = ck.data();
    const now = new Date().toISOString();
    order = {
      userId,
      userName: customer.name,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
      shippingMethod: quote.shippingMethod,
      orderItems: quote.items,
      instructions,
      subtotal: quote.subtotal,
      deliveryFee: quote.deliveryFee,
      promoCode: quote.promoCode,
      promoDiscount: quote.promoDiscount,
      coinsUsed: quote.coinsUsed,
      coinDiscount: quote.coinDiscount,
      totalPrice: quote.total,
      finalAmountPaid: round2(intent.amount_received / 100),
      paymentIntentId,
      paymentStatus: "paid",
      paymentVerified: true,
      paidAt: new Date((intent.created || Date.now() / 1000) * 1000).toISOString(),
      orderStatus: "confirmed",
      orderDate: now,
      ...(pos.isEnabled() && { posSync: { status: "pending", attempts: 0 } }),
    };
    tx.set(globalRef, order);
    tx.set(userOrderRef, order);
    if (quote.coinsUsed > 0) {
      // ponytail: if coins were spent elsewhere between quote and payment, floor at 0
      tx.update(userRef, { walletBalance: Math.max(0, (userSnap.data()?.walletBalance ?? 0) - quote.coinsUsed) });
    }
    tx.update(checkoutRef, { status: "completed", orderId, completedAt: now });
    created = true;
  });

  if (created) {
    // Rewards — never block the order
    try {
      const rewardDoc = await db.collection(COLLECTION_NAMES.REWARDS).doc("rewardDoc").get();
      if (rewardDoc.exists) {
        const earned = calculateRewards(order.totalPrice, rewardDoc.data().dollar);
        const fresh = await userRef.get();
        await userRef.update({ reward: (fresh.data()?.reward || 0) + earned });
      }
    } catch (err) {
      console.warn("[checkout] reward update skipped:", err.message);
    }
    // Paid → kitchen. Background; failures surface in admin.
    pos.syncOrderToPos(orderId, { attempts: 3 });
  }

  return { orderId: order.id ?? orderId, created };
};

module.exports = { quoteCheckout, createCheckoutPayment, finalizeCheckout, RESTAURANT, DELIVERY_TIERS, MAX_DELIVERY_KM };
