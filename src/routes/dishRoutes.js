const express = require("express");
const router = express.Router();
const dishController = require("../controllers/dishController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("image"), dishController.createDish);
router.get("/category/:category", dishController.getDishByCategory);
router.get("/:cat", dishController.getAllDishes);
router.put("/:category/:id", upload.single("image"), dishController.updateDish);
router.delete("/:category/:id", dishController.deleteDish);
router.get("/admin/:category", dishController.getAdminDishes);
router.patch(
  "/admin/:category/:id",
  upload.single("image"),
  dishController.updateAdminDish
);
router.patch("/availability", dishController.updateAvailability);
router.put("/discount/:category/:id", dishController.applyDiscount);
router.get("/specialOffers", dishController.getSpecialOffers);

module.exports = router;
