// src/controllers/categoryController.js

const db = require('../config/database');

// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const categoriesSnapshot = await db.collection('category').get();
        const categories = [];
        categoriesSnapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Category name is required" });
    }
    try {
        const categoryRef = await db.collection('category').add({ name });
        res.status(201).json({ id: categoryRef.id, name });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({ error: "Failed to create category" });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Category name is required" });
    }
    try {
        const categoryRef = db.collection('category').doc(id);
        await categoryRef.update({ name });
        res.status(200).json({ id, name });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Failed to update category" });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await db.collection('category').doc(id).delete();
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Failed to delete category" });
    }
};