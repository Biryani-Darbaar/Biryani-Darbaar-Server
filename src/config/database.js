const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // Update with the path to your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;