const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { authenticateJWT } = require("../middlewares");

// Payment routes - All require authentication
router.post(
  "/create-payment-intent",
  authenticateJWT,
  paymentController.createPaymentIntent
);
router.post(
  "/confirm-payment",
  authenticateJWT,
  paymentController.confirmPayment
);
// Verify a completed payment and optionally mark the linked order as confirmed
router.post(
  "/verify-payment",
  authenticateJWT,
  paymentController.verifyPayment
);
router.get(
  "/payment/:paymentIntentId",
  authenticateJWT,
  paymentController.getPaymentDetails
);

module.exports = router;
