const db = require('../config/database');

// Create a new location
exports.createLocation = async (req, res) => {
    const { name, address } = req.body;

    if (!name || !address) {
        return res.status(400).json({ error: "Name and address are required" });
    }

    try {
        const newLocation = await db.collection('locations').add({ name, address });
        res.status(201).json({ message: "Location created successfully", locationId: newLocation.id });
    } catch (error) {
        console.error("Error creating location:", error);
        res.status(500).json({ error: "Failed to create location" });
    }
};

// Get all locations
exports.getAllLocations = async (req, res) => {
    try {
        const locationsSnapshot = await db.collection('locations').get();
        const locations = [];
        locationsSnapshot.forEach(doc => {
            locations.push({ locationId: doc.id, ...doc.data() });
        });
        res.json(locations);
    } catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).json({ error: "Failed to fetch locations" });
    }
};

// Update a location by ID
exports.updateLocation = async (req, res) => {
    const { id } = req.params;
    const { name, address } = req.body;

    try {
        const locationRef = db.collection('locations').doc(id);
        const locationDoc = await locationRef.get();

        if (!locationDoc.exists) {
            return res.status(404).json({ error: "Location not found" });
        }

        await locationRef.update({ name, address });
        res.status(200).json({ message: "Location updated successfully" });
    } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ error: "Failed to update location" });
    }
};

// Delete a location by ID
exports.deleteLocation = async (req, res) => {
    const { id } = req.params;

    try {
        const locationRef = db.collection('locations').doc(id);
        await locationRef.delete();
        res.status(200).json({ message: "Location deleted successfully" });
    } catch (error) {
        console.error("Error deleting location:", error);
        res.status(500).json({ error: "Failed to delete location" });
    }
};