const { admin } = require("../config/firebase.config");
const pushyAPI = require("../config/pushy.config");

/**
 * Send push notifications to all registered devices
 */
const sendPushNotifications = async (title, body) => {
  // Fetch all device tokens from Firestore
  const tokensSnapshot = await admin.firestore().collection("userTokens").get();

  const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);

  if (tokens.length === 0) {
    throw new Error("No registered tokens found");
  }

  // Set push payload data
  const data = {
    message: body,
  };

  // Set optional notification options for Pushy
  const options = {
    notification: {
      badge: 1,
      sound: "ping.aiff",
      title,
      body,
    },
  };

  // Send push notification to all tokens using Pushy
  const results = await Promise.all(
    tokens.map(
      (token) =>
        new Promise((resolve, reject) => {
          pushyAPI.sendPushNotification(data, [token], options, (err, id) => {
            if (err) {
              reject(err);
            } else {
              resolve({ id, token });
            }
          });
        })
    )
  );

  return results;
};

module.exports = {
  sendPushNotifications,
};
