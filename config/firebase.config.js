// NOTE: dotenv is loaded by index.js BEFORE this module is required, so
// process.env is already populated with the correct .env.<NODE_ENV> values.
// The call here is kept only as a safety net for scripts that require this
// file directly (e.g. seed scripts run outside index.js).
require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

const admin = require("firebase-admin");
const path  = require("path");

// ── Service account ───────────────────────────────────────────────────────────
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(__dirname, "../serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error(
    "❌  Could not load Firebase service account key from:",
    serviceAccountPath,
    "\n   Ensure the file exists and FIREBASE_SERVICE_ACCOUNT_PATH is set correctly."
  );
  process.exit(1);
}

// ── App initialisation ────────────────────────────────────────────────────────
// Guard against double-init when nodemon hot-reloads modules.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Firebase Storage is NOT used — images are stored on local disk.
    // See utils/storage.util.js for the local-storage implementation.
  });
}

const db = admin.firestore();

// NOTE: `bucket` is intentionally not exported.
// All file I/O goes through utils/storage.util.js (local disk).
module.exports = { admin, db };
