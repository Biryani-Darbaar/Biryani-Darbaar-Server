const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { app } = require("../config");

/**
 * Middleware to check if mini games collection has less than max limit
 */
const checkCollectionLimit = async (req, res, next) => {
  try {
    const gamesSnapshot = await db
      .collection(COLLECTION_NAMES.MINI_GAMES)
      .get();
    if (gamesSnapshot.size >= app.features.maxMiniGames) {
      return res.status(400).json({ error: "Collection limit reached" });
    }
    next();
  } catch (error) {
    console.error("Error checking collection limit:", error);
    res.status(500).json({ error: "Failed to check collection limit" });
  }
};

module.exports = {
  checkCollectionLimit,
};
