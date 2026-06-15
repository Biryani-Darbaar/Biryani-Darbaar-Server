const multer = require("multer");

// ── Standard image upload (dishes, avatars, etc.) ─────────────────────────────
// No hard file-size limit here — controller validates and rejects oversized images.
const upload = multer({
  storage: multer.memoryStorage(),
});

// ── Video / media upload (Special Offer Media) ────────────────────────────────
// Enforces a 52 MB multer-level limit so the entire 50 MB video body is never
// buffered into RAM before we can reject it.  The controller still validates
// exact size and MIME type — this limit is just an early-exit safety net.
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 52 * 1024 * 1024 }, // 52 MB (allows controller to show friendly error for 50 MB limit)
});

module.exports = upload;
module.exports.videoUpload = videoUpload;
