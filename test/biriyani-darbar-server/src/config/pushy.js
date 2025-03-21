const Pushy = require('pushy');

const pushyAPI = new Pushy(process.env.PUSHY_API_KEY);

module.exports = pushyAPI;