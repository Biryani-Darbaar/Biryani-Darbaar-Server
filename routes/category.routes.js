const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Category routes
router.get("/categories", categoryController.getCategories);
router.post(
  "/categories",
  authenticateJWT,
  requireAdmin,
  categoryController.createCategory
);
router.delete(
  "/categories/:category",
  authenticateJWT,
  requireAdmin,
  categoryController.deleteCategory
);

module.exports = router;
