const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

router.post("/", cartController.addToCart);
router.post("/getCart", cartController.getCartItems);
router.put("/:id", cartController.updateCartItem);
router.delete("/:id", cartController.removeFromCart);

module.exports = router;
