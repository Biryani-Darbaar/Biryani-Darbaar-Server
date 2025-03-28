// filepath: /biriyani-darbar-server/biriyani-darbar-server/src/controllers/notificationController.js

const { db } = require("../config/firebase");
const Pushy = require("pushy");
const pushyAPI = new Pushy(process.env.PUSHY_API_KEY);

exports.sendNotification = async (req, res) => {
  try {
    const { title, message, tokens } = req.body;
    const data = { title, message };

    const result = await new Promise((resolve, reject) => {
      pushyAPI.sendPushNotification(data, tokens, {}, (err, id) => {
        if (err) reject(err);
        else resolve(id);
      });
    });

    await db.collection("notifications").add({
      title,
      message,
      sentAt: new Date(),
      recipients: tokens,
    });

    res.status(200).json({ success: true, pushId: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notificationsSnapshot = await db
      .collection("notifications")
      .orderBy("sentAt", "desc")
      .get();

    const notifications = [];
    notificationsSnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
