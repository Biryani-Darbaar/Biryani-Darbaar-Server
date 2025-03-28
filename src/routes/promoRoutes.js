const express = require("express");
const router = express.Router();
const promoController = require("../controllers/promoController");

router.post("/", promoController.createPromo);
router.get("/", promoController.getPromos);
router.put("/:id", promoController.updatePromo);
router.delete("/:id", promoController.deletePromo);

module.exports = router;
