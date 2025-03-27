// filepath: /biriyani-darbar-server/biriyani-darbar-server/src/controllers/notificationController.js

const admin = require('../config/firebase');
const db = require('../config/database');

// Function to send notifications
const sendNotification = async (req, res) => {
    const { title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
    }

    try {
        const tokensSnapshot = await db.collection("userTokens").get();
        const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

        if (tokens.length === 0) {
            return res.status(404).json({ error: "No registered tokens found" });
        }

        const data = { message: body };
        const options = {
            notification: {
                badge: 1,
                sound: "ping.aiff",
                title,
                body,
            },
        };

        const results = await Promise.all(
            tokens.map((token) =>
                admin.messaging().sendToDevice(token, data, options)
            )
        );

        await db.collection("notifications").add({
            title,
            body,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ message: "Notifications sent successfully", results });
    } catch (error) {
        console.error("Error sending notifications:", error);
        res.status(500).json({ error: "Failed to send notifications" });
    }
};

// Function to get notifications
const getNotifications = async (req, res) => {
    try {
        const notificationsSnapshot = await db.collection("notifications").orderBy("timestamp", "desc").get();
        const notifications = [];
        notificationsSnapshot.forEach((doc) => {
            notifications.push({ notificationId: doc.id, ...doc.data() });
        });
        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

module.exports = {
    sendNotification,
    getNotifications,
};