const stripe = require("../config/stripe.config");
const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { successResponse, asyncHandler } = require("../utils/response.util");
const { ValidationError, PaymentError } = require("../utils/errors.util");

/**
 * Create payment intent
 */
const createPaymentIntent = asyncHandler(async (req, res) => {
  const { amount, currency } = req.body;

  // Validation
  if (!amount || amount <= 0) {
    throw new ValidationError("Valid amount is required");
  }

  if (!currency) {
    throw new ValidationError("Currency is required");
  }

  try {
    // Convert dollars to cents (Stripe requires smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(), // e.g., 'aud', 'usd'
      metadata: {
        userId: req.user?.userId || "guest",
        timestamp: new Date().toISOString(),
      },
    });

    successResponse(
      res,
      200,
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      "Payment intent created successfully"
    );
  } catch (stripeError) {
    throw new PaymentError(
      stripeError.message || "Failed to create payment intent"
    );
  }
});

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
  createPaymentIntent,
  confirmPayment,
  getPaymentDetails,
  verifyPayment,
};
