const { db } = require("../config/firebase");

exports.addLocation = async (req, res) => {
  try {
    const locationData = req.body;
    const docRef = await db.collection("locations").add({
      ...locationData,
      createdAt: new Date(),
    });
    res.status(201).json({ id: docRef.id, ...locationData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const locationsSnapshot = await db.collection("locations").get();
    const locations = [];
    locationsSnapshot.forEach((doc) => {
      {
        locations.push({ id: doc.id, ...doc.data() });
      }
    });
    res.status(200).json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("locations").doc(id).update(req.body);
    res.status(200).json({ message: "Location updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("locations").doc(id).delete();
    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
