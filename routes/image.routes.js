const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const imageController = require("../controllers/image.controller");

// Image routes
router.post("/img", upload.array("images", 50), imageController.uploadImages);
router.get("/img", imageController.getImages);
router.delete("/img", imageController.deleteImages);

module.exports = router;
