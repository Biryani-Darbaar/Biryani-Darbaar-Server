const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // Update with the path to your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.DATABASE_URL,
});

const db = admin.firestore();

module.exports = db;