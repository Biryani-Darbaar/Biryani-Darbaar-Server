const express = require("express");
const router = express.Router();
const dishController = require("../controllers/dish.controller");
const { optionalAuthenticate } = require("../middlewares/auth.middleware");

// Public dish reads only. All dish writes live under /admin/dishes/* (admin.routes.js),
// which requires authenticateJWT + requireAdmin.

// optionalAuthenticate: processes the JWT when present (sets req.user) but never
// blocks unauthenticated requests.  The controller uses req.user?.userId to apply
// gold-member pricing without reading from any server-global storage.
router.get("/dishes/category/:category", optionalAuthenticate, dishController.getDishesByCategory);
router.get("/dishes/:cat", dishController.getAllDishes);
router.get("/specialOffers", dishController.getSpecialOffers);

module.exports = router;
