const express = require("express");
const router = express.Router();
const promoController = require("../controllers/promo.controller");

// Promo routes
router.post("/create-promo", promoController.createPromo);
router.post("/validate-promo", promoController.validatePromo);
router.get("/get-all-promos", promoController.getAllPromos);

module.exports = router;
