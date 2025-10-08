const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { errorResponse, successResponse } = require("../utils/response.util");
const { calculateDollarValue } = require("../utils/calculations.util");

/**
 * Create or update reward
 */
const createOrUpdateReward = async (req, res) => {
  const { reward, dollar } = req.body;

  if (!reward || !dollar) {
    return errorResponse(res, 400, "Reward and dollar values are required");
  }

  try {
    const rewardRef = db.collection(COLLECTION_NAMES.REWARDS).doc("rewardDoc");
    const doc = await rewardRef.get();

    if (doc.exists) {
      // Update the existing document
      await rewardRef.update({ reward, dollar });
      successResponse(res, 200, { message: "Reward updated successfully" });
    } else {
      // Create a new document
      await rewardRef.set({ reward, dollar });
      successResponse(res, 201, { message: "Reward created successfully" });
    }
  } catch (error) {
    errorResponse(res, 500, "Failed to create or update reward", error);
  }
};

/**
 * Get all rewards
 */
const getRewards = async (req, res) => {
  try {
    const rewardsSnapshot = await db.collection(COLLECTION_NAMES.REWARDS).get();
    const rewards = [];

    rewardsSnapshot.forEach((doc) => {
      rewards.push({ reward: doc.id, ...doc.data() });
    });

    successResponse(res, 200, rewards);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch rewards", error);
  }
};

/**
 * Apply reward
 */
const applyReward = async (req, res) => {
  const { reward, userId, dollar } = req.body;

  if (!reward || !userId) {
    return errorResponse(res, 400, "Reward and userId are required");
  }

  try {
    const rewardRef = db.collection(COLLECTION_NAMES.REWARDS).doc("rewardDoc");
    const rewardDoc = await rewardRef.get();

    const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!rewardDoc.exists) {
      return errorResponse(res, 404, "Reward data not found");
    }

    if (reward !== userDoc.data().reward) {
      return errorResponse(res, 404, "Reward data mismatch");
    }

    const rewardData = rewardDoc.data();
    let dollarValue = calculateDollarValue(rewardData);

    const totalPrice = dollar - dollarValue;

    await userRef.update({ reward: userDoc.data().reward - 10 });

    successResponse(res, 200, {
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      reward: userDoc.data().reward - 10,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to estimate reward value", error);
  }
};

module.exports = {
  createOrUpdateReward,
  getRewards,
  applyReward,
};
