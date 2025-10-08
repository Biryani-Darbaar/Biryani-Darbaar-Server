const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Create a new mini game
 */
const createMiniGame = async (req, res) => {
  const { name, value, type } = req.body;

  if (!name || !value) {
    return errorResponse(res, 400, "Name and offer are required");
  }

  try {
    const gameRef = db.collection(COLLECTION_NAMES.MINI_GAMES).doc();
    await gameRef.set({ name, value, type });
    successResponse(res, 201, {
      message: "Mini game created successfully",
      gameId: gameRef.id,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to create mini game", error);
  }
};

/**
 * Get all mini games
 */
const getMiniGames = async (req, res) => {
  try {
    const gamesSnapshot = await db
      .collection(COLLECTION_NAMES.MINI_GAMES)
      .get();
    const games = [];
    gamesSnapshot.forEach((doc) => {
      games.push({ gameId: doc.id, ...doc.data() });
    });
    successResponse(res, 200, games);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch mini games", error);
  }
};

/**
 * Update a mini game by ID
 */
const updateMiniGame = async (req, res) => {
  const gameId = req.params.id;
  const { name, value, type } = req.body;

  if (!name || !value || !type) {
    return errorResponse(res, 400, "Name and offer are required");
  }

  try {
    const gameRef = db.collection(COLLECTION_NAMES.MINI_GAMES).doc(gameId);
    await gameRef.update({ name, value, type });
    successResponse(res, 200, { message: "Mini game updated successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to update mini game", error);
  }
};

/**
 * Delete a mini game by ID
 */
const deleteMiniGame = async (req, res) => {
  const gameId = req.params.id;

  try {
    const gameRef = db.collection(COLLECTION_NAMES.MINI_GAMES).doc(gameId);
    await gameRef.delete();
    successResponse(res, 200, { message: "Mini game deleted successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to delete mini game", error);
  }
};

module.exports = {
  createMiniGame,
  getMiniGames,
  updateMiniGame,
  deleteMiniGame,
};
