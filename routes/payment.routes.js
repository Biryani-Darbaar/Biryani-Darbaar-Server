const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const { optionalAuthenticate } = require("../middlewares");

// Payment routes
router.post(
  "/create-payment-intent",
  optionalAuthenticate,
  paymentController.createPaymentIntent
);
router.post("/confirm-payment", paymentController.confirmPayment);
router.get("/payment/:paymentIntentId", paymentController.getPaymentDetails);

module.exports = router;
