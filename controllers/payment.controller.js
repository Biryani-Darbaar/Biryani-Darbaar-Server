const stripe = require("../config/stripe.config");
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
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents, ensure integer
      currency: currency.toLowerCase(), // e.g., 'usd', 'inr'
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

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPaymentDetails,
};
