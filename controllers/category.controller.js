const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { deleteFile } = require("../utils/storage.util");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Get all categories
 */
const getCategories = async (req, res) => {
  try {
    const categoriesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .get();
    const categories = [];

    categoriesSnapshot.forEach((doc) => {
      categories.push(doc.data().name);
    });

    successResponse(res, 200, categories);
  } catch (error) {
    if (error.code === 16) {
      // Firestore UNAUTHENTICATED error
      console.error(
        "Authentication error: Ensure valid Firebase credentials.",
        error
      );
      return errorResponse(
        res,
        401,
        "Authentication error: Invalid Firebase credentials."
      );
    }

    console.error("Failed to fetch categories:", error);
    errorResponse(res, 500, "Failed to fetch categories", error);
  }
};

/**
 * Create a new category
 */
const createCategory = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return errorResponse(res, 400, "Category name is required");
  }

  try {
    // Check if the category already exists
    const categoryRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(name);
    const doc = await categoryRef.get();

    if (doc.exists) {
      return errorResponse(res, 409, "Category already exists");
    }

    // Add new category to Firestore
    await categoryRef.set({ name });

    successResponse(res, 201, {
      message: "Category created successfully",
      categoryId: name,
      categoryName: name,
    });
  } catch (error) {
    errorResponse(res, 500, "Internal server error", error);
  }
};

/**
 * Delete a category
 */
const deleteCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const categoryRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(category);

    // Get all dishes associated with the category
    const dishesSnapshot = await categoryRef
      .collection(COLLECTION_NAMES.DISHES)
      .get();

    // Loop through the dishes and delete them
    const deletePromises = [];
    dishesSnapshot.forEach((dishDoc) => {
      const dishData = dishDoc.data();
      const imageUrl = dishData.image;

      // Delete the dish document
      deletePromises.push(dishDoc.ref.delete());

      // If an image URL exists, delete the image from Firebase Storage
      if (imageUrl) {
        deletePromises.push(deleteFile(imageUrl));
      }
    });

    // Wait for all deletes to complete
    await Promise.all(deletePromises);

    // Finally, delete the category document itself
    await categoryRef.delete();

    successResponse(res, 200, {
      message: "Category and associated dishes deleted successfully",
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to delete category", error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
};
