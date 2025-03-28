const { db } = require("../config/firebase");

// Create a new reward
exports.createReward = async (req, res) => {
  try {
    const rewardData = {
      ...req.body,
      createdAt: new Date(),
      isActive: true,
    };

    const docRef = await db.collection("rewards").add(rewardData);
    res.status(201).json({ id: docRef.id, ...rewardData });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Get rewards for a specific user
exports.getUserRewards = async (req, res) => {
  try {
    const { userId } = req.params;
    const rewardsSnapshot = await db
      .collection("rewards")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    const rewards = [];
    rewardsSnapshot.forEach((doc) => {
      rewards.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Redeem a reward
exports.redeemReward = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("rewards").doc(id).update({
      isActive: false,
      redeemedAt: new Date(),
    });
    res.status(200).json({ message: "Reward redeemed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
