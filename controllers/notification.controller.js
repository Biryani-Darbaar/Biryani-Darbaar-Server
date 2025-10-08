const { admin, db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { sendPushNotifications } = require("../lib/notification.lib");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Send notification to all users
 */
const sendNotification = async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return errorResponse(res, 400, "Title and body are required");
  }

  try {
    const results = await sendPushNotifications(title, body);

    // Add the notification to the Firestore "notifications" collection
    await db.collection(COLLECTION_NAMES.NOTIFICATIONS).add({
      title,
      body,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    successResponse(res, 200, {
      message: "Notifications sent successfully",
      results,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to send notifications", error);
  }
};

/**
 * Get all notifications
 */
const getNotifications = async (req, res) => {
  try {
    const notificationsSnapshot = await db
      .collection(COLLECTION_NAMES.NOTIFICATIONS)
      .orderBy("timestamp", "desc")
      .get();
    const notifications = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({ notificationId: doc.id, ...doc.data() });
    });
    successResponse(res, 200, notifications);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch notifications", error);
  }
};

/**
 * Store device token
 */
const storeToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return errorResponse(res, 400, "Token is required");
  }

  try {
    // Store the token in the userTokens collection
    await db.collection(COLLECTION_NAMES.USER_TOKENS).add({ token });
    successResponse(res, 201, { message: "Token stored successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to store token", error);
  }
};

module.exports = {
  sendNotification,
  getNotifications,
  storeToken,
};
