const express = require("express");
const router = express.Router();
const dishController = require("../controllers/dishController");

router.post("/", dishController.createDish);
router.get("/", dishController.getAllDishes);
router.get("/:id", dishController.getDishById);
router.put("/:id", dishController.updateDish);
router.delete("/:id", dishController.deleteDish);

module.exports = router;
