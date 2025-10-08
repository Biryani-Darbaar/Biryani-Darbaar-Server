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
router.post("/confirm-payment", authenticateJWT, paymentController.confirmPayment);
router.get("/payment/:paymentIntentId", authenticateJWT, paymentController.getPaymentDetails);

module.exports = router;
