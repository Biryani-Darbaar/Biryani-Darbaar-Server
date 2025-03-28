// src/controllers/categoryController.js

const { db } = require("../config/firebase");

exports.getAllCategories = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection("categories").get();
    const categories = [];
    categoriesSnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const doc = await db.collection("categories").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const categoryData = req.body;
    const docRef = await db.collection("categories").add(categoryData);
    res.status(201).json({ id: docRef.id, ...categoryData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    await db.collection("categories").doc(req.params.id).update(req.body);
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await db.collection("categories").doc(req.params.id).delete();
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
