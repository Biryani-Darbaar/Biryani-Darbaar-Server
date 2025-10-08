const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

// Notification routes
router.post("/send-notification", notificationController.sendNotification);
router.get("/notifications", notificationController.getNotifications);
router.post("/store-token", notificationController.storeToken);

module.exports = router;
