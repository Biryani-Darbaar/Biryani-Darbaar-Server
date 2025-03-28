// src/controllers/dishController.js

const { db } = require("../config/firebase"); // Import the database configuration

// Function to create a new dish
exports.createDish = async (req, res) => {
  try {
    const dishData = req.body;
    const docRef = await db.collection("dishes").add({
      ...dishData,
      createdAt: new Date(),
    });
    res.status(201).json({ id: docRef.id, ...dishData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to get all dishes
exports.getAllDishes = async (req, res) => {
  try {
    const dishesSnapshot = await db.collection("dishes").get();
    const dishes = [];
    dishesSnapshot.forEach((doc) => {
      dishes.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(dishes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to get a dish by ID
exports.getDishById = async (req, res) => {
  try {
    const doc = await db.collection("dishes").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Dish not found" });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to update an existing dish
exports.updateDish = async (req, res) => {
  try {
    await db.collection("dishes").doc(req.params.id).update(req.body);
    res.status(200).json({ message: "Dish updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to delete a dish
exports.deleteDish = async (req, res) => {
  try {
    await db.collection("dishes").doc(req.params.id).delete();
    res.status(200).json({ message: "Dish deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
