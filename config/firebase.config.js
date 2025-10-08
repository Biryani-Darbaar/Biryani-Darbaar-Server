require("dotenv").config();
const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");

// Load service account from file path specified in env or use default
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.resolve(__dirname, "../serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error(
    "ERROR: Could not load Firebase service account key from:",
    serviceAccountPath
  );
  console.error(
    "Please ensure the file exists and FIREBASE_SERVICE_ACCOUNT_PATH is set correctly"
  );
  process.exit(1);
}

if (!process.env.FIREBASE_STORAGE_BUCKET) {
  console.warn(
    "WARNING: FIREBASE_STORAGE_BUCKET is not set, using default from service account"
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = getStorage().bucket();

module.exports = { admin, db, bucket };
