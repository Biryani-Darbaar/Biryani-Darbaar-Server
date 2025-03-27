// filepath: /biriyani-darbar-server/biriyani-darbar-server/src/controllers/userController.js

const admin = require('../config/firebase');
const db = require('../config/database');

// User registration
exports.registerUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
        });
        res.status(201).json({ uid: userRecord.uid, email: userRecord.email });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
};

// User login
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const userCredential = await admin.auth().signInWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();
        res.status(200).json({ token: idToken });
    } catch (error) {
        console.error("Error logging in user:", error);
        res.status(401).json({ error: "Invalid credentials" });
    }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
    const userId = req.params.id;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }
        res.status(200).json({ userId: userDoc.id, ...userDoc.data() });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
    const userId = req.params.id;
    const updatedData = req.body;
    try {
        await db.collection('users').doc(userId).update(updatedData);
        res.status(200).json({ message: "User profile updated successfully" });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ error: "Failed to update user profile" });
    }
};

// Delete user account
exports.deleteUserAccount = async (req, res) => {
    const userId = req.params.id;
    try {
        await admin.auth().deleteUser(userId);
        await db.collection('users').doc(userId).delete();
        res.status(200).json({ message: "User account deleted successfully" });
    } catch (error) {
        console.error("Error deleting user account:", error);
        res.status(500).json({ error: "Failed to delete user account" });
    }
};