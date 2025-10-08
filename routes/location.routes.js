const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const locationController = require("../controllers/location.controller");

// Location routes
router.post(
  "/locations",
  upload.single("image"),
  locationController.createLocation
);
router.get("/locations", locationController.getLocations);
router.put(
  "/locations/:id",
  upload.single("image"),
  locationController.updateLocation
);
router.delete("/locations/:id", locationController.deleteLocation);

module.exports = router;
