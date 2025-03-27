const admin = require('../config/firebase');
const db = admin.firestore();

// Create a new reward
exports.createReward = async (req, res) => {
    const { reward, dollar } = req.body;

    if (!reward || !dollar) {
        return res.status(400).json({ error: "Reward and dollar values are required" });
    }

    try {
        const rewardRef = db.collection("rewards").doc("rewardDoc");
        const doc = await rewardRef.get();

        if (doc.exists) {
            // Update the existing document
            await rewardRef.update({ reward, dollar });
            res.status(200).json({ message: "Reward updated successfully" });
        } else {
            // Create a new document
            await rewardRef.set({ reward, dollar });
            res.status(201).json({ message: "Reward created successfully" });
        }
    } catch (error) {
        console.error("Error creating or updating reward:", error);
        res.status(500).json({ error: "Failed to create or update reward" });
    }
};

// Get all rewards
exports.getAllRewards = async (req, res) => {
    try {
        const rewardsSnapshot = await db.collection("rewards").get();
        const rewards = [];

        rewardsSnapshot.forEach((doc) => {
            rewards.push({ reward: doc.id, ...doc.data() });
        });

        res.json(rewards);
    } catch (error) {
        console.error("Error fetching rewards:", error);
        res.status(500).json({ error: "Failed to fetch rewards" });
    }
};