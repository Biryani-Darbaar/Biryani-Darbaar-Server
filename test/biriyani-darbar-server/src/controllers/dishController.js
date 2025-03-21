// src/controllers/dishController.js

const db = require('../config/database'); // Import the database configuration

// Function to add a new dish
const addDish = async (req, res) => {
    const { name, price, category } = req.body;
    try {
        const newDish = await db.collection('dishes').add({ name, price, category });
        res.status(201).json({ id: newDish.id, name, price, category });
    } catch (error) {
        console.error("Error adding dish:", error);
        res.status(500).json({ error: "Failed to add dish" });
    }
};

// Function to update an existing dish
const updateDish = async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    try {
        await db.collection('dishes').doc(id).update(updatedData);
        res.status(200).json({ message: "Dish updated successfully" });
    } catch (error) {
        console.error("Error updating dish:", error);
        res.status(500).json({ error: "Failed to update dish" });
    }
};

// Function to get all dishes
const getAllDishes = async (req, res) => {
    try {
        const dishesSnapshot = await db.collection('dishes').get();
        const dishes = [];
        dishesSnapshot.forEach(doc => {
            dishes.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(dishes);
    } catch (error) {
        console.error("Error fetching dishes:", error);
        res.status(500).json({ error: "Failed to fetch dishes" });
    }
};

// Function to get a dish by ID
const getDishById = async (req, res) => {
    const { id } = req.params;
    try {
        const dishDoc = await db.collection('dishes').doc(id).get();
        if (!dishDoc.exists) {
            return res.status(404).json({ error: "Dish not found" });
        }
        res.status(200).json({ id: dishDoc.id, ...dishDoc.data() });
    } catch (error) {
        console.error("Error fetching dish:", error);
        res.status(500).json({ error: "Failed to fetch dish" });
    }
};

// Function to delete a dish
const deleteDish = async (req, res) => {
    const { id } = req.params;
    try {
        await db.collection('dishes').doc(id).delete();
        res.status(200).json({ message: "Dish deleted successfully" });
    } catch (error) {
        console.error("Error deleting dish:", error);
        res.status(500).json({ error: "Failed to delete dish" });
    }
};

module.exports = {
    addDish,
    updateDish,
    getAllDishes,
    getDishById,
    deleteDish
};