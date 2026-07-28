const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const locationController = require("../controllers/location.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Location routes
router.post(
  "/locations",
  authenticateJWT,
  requireAdmin,
  upload.single("image"),
  locationController.createLocation
);
router.get("/locations", locationController.getLocations);
router.put(
  "/locations/:id",
  authenticateJWT,
  requireAdmin,
  upload.single("image"),
  locationController.updateLocation
);
router.delete(
  "/locations/:id",
  authenticateJWT,
  requireAdmin,
  locationController.deleteLocation
);

module.exports = router;
