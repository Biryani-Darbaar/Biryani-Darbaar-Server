const Pushy = require('pushy');

const pushy = new Pushy(process.env.PUSHY_API_KEY);

const sendPushNotification = (data, tokens, options) => {
    return new Promise((resolve, reject) => {
        pushy.sendPushNotification(data, tokens, options, (err, id) => {
            if (err) {
                return reject(err);
            }
            resolve({ id, tokens });
        });
    });
};

module.exports = {
    sendPushNotification,
};