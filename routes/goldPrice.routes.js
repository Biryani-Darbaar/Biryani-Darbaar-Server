const express = require("express");
const router = express.Router();
const goldPriceController = require("../controllers/goldPrice.controller");

// Gold price routes
router.post("/goldPrice", goldPriceController.setGoldPrice);
router.get("/goldPrice", goldPriceController.getGoldPrice);
router.put("/goldDiscountApply", goldPriceController.applyGoldDiscountToAll);
router.put("/updateDishesGoldPrice", goldPriceController.updateDishesGoldPrice);

module.exports = router;
