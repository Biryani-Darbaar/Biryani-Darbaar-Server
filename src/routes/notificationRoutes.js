const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Route to send a notification
router.post('/send', notificationController.sendNotification);

// Route to get all notifications
router.get('/', notificationController.getNotifications);

module.exports = router;