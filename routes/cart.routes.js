const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { authenticateJWT } = require("../middlewares");

// Cart routes - All require authentication
router.post("/cart", authenticateJWT, cartController.addToCart);
router.post("/getCart", authenticateJWT, cartController.getCart);
router.put("/cart/:id", authenticateJWT, cartController.updateCartItem);
router.delete("/cart/:id", authenticateJWT, cartController.deleteCartItem);

module.exports = router;
