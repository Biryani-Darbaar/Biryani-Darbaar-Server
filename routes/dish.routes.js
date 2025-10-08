const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const dishController = require("../controllers/dish.controller");

// Dish routes
router.post("/dishes", upload.single("image"), dishController.addDish);
router.get("/dishes/category/:category", dishController.getDishesByCategory);
router.get("/dishes/:cat", dishController.getAllDishes);
router.put(
  "/dishes/:category/:id",
  upload.single("image"),
  dishController.updateDish
);
router.delete("/dishes/:category/:id", dishController.deleteDish);

// Admin dish routes
router.get("/dishes/admin/:category", dishController.getDishesByCategoryAdmin);
router.patch(
  "/dishes/admin/:category/:id",
  upload.single("image"),
  dishController.updateDishAdmin
);

// Dish discount and offers
router.put("/dishes/discount/:category/:id", dishController.applyDiscount);
router.get("/specialOffers", dishController.getSpecialOffers);

// Dish availability
router.patch("/availability", dishController.toggleAvailability);

module.exports = router;
