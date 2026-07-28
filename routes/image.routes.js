const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const imageController = require("../controllers/image.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Image routes
router.post(
  "/img",
  authenticateJWT,
  requireAdmin,
  upload.array("images", 50),
  imageController.uploadImages
);
router.get(
  "/img",
  authenticateJWT,
  requireAdmin,
  imageController.getImages
);
router.delete(
  "/img",
  authenticateJWT,
  requireAdmin,
  imageController.deleteImages
);

module.exports = router;
