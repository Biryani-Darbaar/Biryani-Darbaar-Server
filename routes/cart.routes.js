const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");

// Cart routes
router.post("/cart", cartController.addToCart);
router.post("/getCart", cartController.getCart);
router.put("/cart/:id", cartController.updateCartItem);
router.delete("/cart/:id", cartController.deleteCartItem);

module.exports = router;
