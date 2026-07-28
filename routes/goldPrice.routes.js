const express = require("express");
const router = express.Router();
const goldPriceController = require("../controllers/goldPrice.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Gold price routes
router.post(
  "/goldPrice",
  authenticateJWT,
  requireAdmin,
  goldPriceController.setGoldPrice
);
router.get("/goldPrice", goldPriceController.getGoldPrice);
router.put(
  "/goldDiscountApply",
  authenticateJWT,
  requireAdmin,
  goldPriceController.applyGoldDiscountToAll
);
router.put(
  "/updateDishesGoldPrice",
  authenticateJWT,
  requireAdmin,
  goldPriceController.updateDishesGoldPrice
);

module.exports = router;
