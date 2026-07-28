const express = require("express");
const router = express.Router();
const promoController = require("../controllers/promo.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Promo routes
router.post(
  "/create-promo",
  authenticateJWT,
  requireAdmin,
  promoController.createPromo
);
router.post("/validate-promo", promoController.validatePromo);
router.get(
  "/get-all-promos",
  authenticateJWT,
  requireAdmin,
  promoController.getAllPromos
);

module.exports = router;
