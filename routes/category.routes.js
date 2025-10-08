const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");

// Category routes
router.get("/categories", categoryController.getCategories);
router.post("/categories", categoryController.createCategory);
router.delete("/categories/:category", categoryController.deleteCategory);

module.exports = router;
