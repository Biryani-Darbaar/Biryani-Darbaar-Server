const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Notification routes
router.post(
  "/send-notification",
  authenticateJWT,
  requireAdmin,
  notificationController.sendNotification
);
router.get("/notifications", notificationController.getNotifications);
router.post("/store-token", notificationController.storeToken);

module.exports = router;
