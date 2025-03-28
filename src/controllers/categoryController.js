// src/controllers/categoryController.js

const { db } = require("../config/firebase");

exports.getAllCategories = async (req, res) => {
  try {
    const categoriesSnapshot = await db.collection("category").get();
    const categories = [];
    categoriesSnapshot.forEach((doc) => {
      categories.push(doc.data().name);
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Category name is required" });
  }
  try {
    const categoryRef = db.collection("category").doc(name);
    const doc = await categoryRef.get();
    if (doc.exists) {
      return res.status(409).json({ error: "Category already exists" });
    }
    await categoryRef.set({ name });
    res.status(201).json({
      message: "Category created successfully",
      categoryId: name,
      categoryName: name,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const categoryRef = db.collection("category").doc(category);
    const dishesSnapshot = await categoryRef.collection("dishes").get();
    const deletePromises = [];
    dishesSnapshot.forEach((dishDoc) => {
      const dishData = dishDoc.data();
      deletePromises.push(dishDoc.ref.delete());
      if (dishData.image) {
        const fileName = dishData.image.split("/").pop();
        const file = bucket.file(fileName);
        deletePromises.push(file.delete());
      }
    });
    await Promise.all(deletePromises);
    await categoryRef.delete();
    res
      .status(200)
      .json({ message: "Category and associated dishes deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" });
  }
};
