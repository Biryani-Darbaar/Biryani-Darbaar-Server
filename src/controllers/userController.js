// filepath: /biriyani-darbar-server/biriyani-darbar-server/src/controllers/userController.js

const { db } = require("../config/firebase");
const admin = require("firebase-admin");

exports.createUser = async (req, res) => {
  try {
    const { email, password, displayName, phoneNumber } = req.body;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      phoneNumber,
    });

    const userData = {
      email,
      displayName,
      phoneNumber,
      createdAt: new Date(),
      points: 0,
    };

    await db.collection("users").doc(userRecord.uid).set(userData);
    res.status(201).json({ uid: userRecord.uid, ...userData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("users").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await db.collection("users").doc(id).update(updates);
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    await db
      .collection("users")
      .doc(id)
      .update({
        points: admin.firestore.FieldValue.increment(points),
      });

    res.status(200).json({ message: "Points updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await admin.auth().deleteUser(id);
    await db.collection("users").doc(id).delete();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
