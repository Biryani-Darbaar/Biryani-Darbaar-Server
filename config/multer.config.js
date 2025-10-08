const multer = require("multer");

// Multer middleware for handling image uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store the file in memory temporarily
});

module.exports = upload;
