const stripe = require("../config/stripe.config");
const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { successResponse, asyncHandler } = require("../utils/response.util");
const checkout = require("../lib/checkout.lib");
const { ValidationError, PaymentError } = require("../utils/errors.util");

/**
 * POST /checkout/quote — price the cart server-side (what the customer will pay)
 */
const quote = asyncHandler(async (req, res) => {
  const result = await checkout.quoteCheckout(req.user.userId, req.body);
  successResponse(res, 200, result);
});

/**
 * POST /create-payment-intent — PaymentIntent for the server-quoted total.
 * The client sends the cart, never an amount.
 */
const createPaymentIntent = asyncHandler(async (req, res) => {
  const result = await checkout.createCheckoutPayment(req.user.userId, req.body);
  successResponse(res, 200, result, "Payment intent created successfully");
});

/**
 * POST /stripe/webhook — Stripe calls this when a payment succeeds, so the order
 * is created even if the customer closes the tab right after paying.
 * Mounted with a raw body (before the JSON parser) for signature verification.
 */
const stripeWebhook = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn("[stripe] webhook signature check failed:", err.message);
    return res.status(400).send("Invalid signature");
  }

  if (event.type === "payment_intent.succeeded") {
    try {
      const { orderId, created } = await checkout.finalizeCheckout(event.data.object.id);
      console.log(`[stripe] ${event.data.object.id} -> order ${orderId}${created ? " (created by webhook)" : ""}`);
    } catch (err) {
      if (err.statusCode === 404) {
        // Not one of our checkout payments (e.g. created elsewhere) — nothing to do
        return res.json({ received: true, ignored: true });
      }
      console.error("[stripe] webhook finalize failed:", err.message);
      return res.status(500).send("Finalize failed"); // Stripe retries
    }
  }
  res.json({ received: true });
};

/**
 * Confirm payment
 */
const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    throw new ValidationError("Payment intent ID is required");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    successResponse(
      res,
      200,
      {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      "Payment status retrieved"
    );
  } catch (stripeError) {
    throw new PaymentError(stripeError.message || "Failed to retrieve payment");
  }
});

/**
 * Get payment details
 */
const getPaymentDetails = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.params;

  if (!paymentIntentId) {
    throw new ValidationError("Payment intent ID is required");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    successResponse(res, 200, {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata,
    });
  } catch (stripeError) {
    throw new PaymentError(
      stripeError.message || "Failed to retrieve payment details"
    );
  }
});

/**
 * Verify that a Stripe payment succeeded and optionally confirm the linked order
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body;

  if (!paymentIntentId) {
    throw new ValidationError("Payment intent ID is required");
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const verified = paymentIntent.status === "succeeded";

    // If an order ID is provided, keep its status in sync with Stripe
    if (orderId && verified && req.user?.userId) {
      const userId = req.user.userId;
      const updateData = { orderStatus: "confirmed", paymentVerified: true };

      await Promise.all([
        db
          .collection(COLLECTION_NAMES.USERS)
          .doc(userId)
          .collection(COLLECTION_NAMES.ORDERS)
          .doc(orderId)
          .update(updateData),
        db
          .collection(COLLECTION_NAMES.ORDER)
          .doc(orderId)
          .update(updateData),
      ]);
    }

    successResponse(
      res,
      200,
      {
        verified,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      verified ? "Payment verified" : "Payment not completed"
    );
  } catch (stripeError) {
    throw new PaymentError(
      stripeError.message || "Failed to verify payment"
    );
  }
});

module.exports = {
  quote,
  stripeWebhook,
  createPaymentIntent,
  confirmPayment,
  getPaymentDetails,
  verifyPayment,
};
