const checkCollectionLimit = async (req, res, next) => {
  try {
    const gamesSnapshot = await db.collection("miniGames").get();
    if (gamesSnapshot.size >= 6) {
      return res.status(400).json({ error: "Collection limit reached" });
    }
    next();
  } catch (error) {
    console.error("Error checking collection limit:", error);
    res.status(500).json({ error: "Failed to check collection limit" });
  }
};

export default checkCollectionLimit;