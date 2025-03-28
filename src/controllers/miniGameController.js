const { db } = require("../config/firebase");

// Create a new mini game
exports.createGame = async (req, res) => {
  try {
    const gameData = req.body;
    const docRef = await db.collection("miniGames").add({
      ...gameData,
      createdAt: new Date(),
    });
    res.status(201).json({ id: docRef.id, ...gameData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all mini games
exports.getAllGames = async (req, res) => {
  try {
    const gamesSnapshot = await db.collection("miniGames").get();
    const games = [];
    gamesSnapshot.forEach((doc) => {
      games.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a mini game by ID
exports.updateGame = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("miniGames").doc(id).update(req.body);
    res.status(200).json({ message: "Game updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a mini game by ID
exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("miniGames").doc(id).delete();
    res.status(200).json({ message: "Game deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
