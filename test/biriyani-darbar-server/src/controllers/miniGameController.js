const db = require('../config/database');
const { checkCollectionLimit } = require('../middleware/checkCollectionLimit');

// Create a new mini game
exports.createMiniGame = async (req, res) => {
  const { name, value, type } = req.body;

  if (!name || !value) {
    return res.status(400).json({ error: "Name and value are required" });
  }

  try {
    const gameRef = db.collection("miniGames").doc();
    await gameRef.set({ name, value, type });
    res.status(201).json({ message: "Mini game created successfully", gameId: gameRef.id });
  } catch (error) {
    console.error("Error creating mini game:", error);
    res.status(500).json({ error: "Failed to create mini game" });
  }
};

// Get all mini games
exports.getAllMiniGames = async (req, res) => {
  try {
    const gamesSnapshot = await db.collection("miniGames").get();
    const games = [];
    gamesSnapshot.forEach((doc) => {
      games.push({ gameId: doc.id, ...doc.data() });
    });
    res.json(games);
  } catch (error) {
    console.error("Error fetching mini games:", error);
    res.status(500).json({ error: "Failed to fetch mini games" });
  }
};

// Update a mini game by ID
exports.updateMiniGame = async (req, res) => {
  const gameId = req.params.id;
  const { name, value, type } = req.body;

  if (!name || !value || !type) {
    return res.status(400).json({ error: "Name, value, and type are required" });
  }

  try {
    const gameRef = db.collection("miniGames").doc(gameId);
    await gameRef.update({ name, value, type });
    res.status(200).json({ message: "Mini game updated successfully" });
  } catch (error) {
    console.error("Error updating mini game:", error);
    res.status(500).json({ error: "Failed to update mini game" });
  }
};

// Delete a mini game by ID
exports.deleteMiniGame = async (req, res) => {
  const gameId = req.params.id;

  try {
    const gameRef = db.collection("miniGames").doc(gameId);
    await gameRef.delete();
    res.status(200).json({ message: "Mini game deleted successfully" });
  } catch (error) {
    console.error("Error deleting mini game:", error);
    res.status(500).json({ error: "Failed to delete mini game" });
  }
};