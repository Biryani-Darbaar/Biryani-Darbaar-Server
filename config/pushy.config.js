require("dotenv").config();
const Pushy = require("pushy");

if (!process.env.PUSHY_API_KEY) {
  console.warn("WARNING: PUSHY_API_KEY is not set in environment variables");
}

const pushyAPI = new Pushy(process.env.PUSHY_API_KEY);

module.exports = pushyAPI;
