const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { deleteFile } = require("../utils/storage.util");
const { errorResponse, successResponse } = require("../utils/response.util");

// ── In-process cache for the category list ────────────────────────────────────
// Categories rarely change (admin action required), so a 5-minute TTL is safe.
// This eliminates a full Firestore collection scan on every page load.
let _categoryCache   = null;
let _categoryCacheTs = 0;
const CATEGORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

const invalidateCategoryCache = () => {
  _categoryCache   = null;
  _categoryCacheTs = 0;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /categories
 * Returns the list of all category names, served from cache when possible.
 */
const getCategories = async (req, res) => {
  try {
    const now = Date.now();
    if (_categoryCache && now - _categoryCacheTs < CATEGORY_TTL_MS) {
      return successResponse(res, 200, _categoryCache);
    }

    const snapshot = await db.collection(COLLECTION_NAMES.CATEGORY).get();
    const categories = snapshot.docs.map((doc) => doc.data().name || doc.id);

    _categoryCache   = categories;
    _categoryCacheTs = now;

    return successResponse(res, 200, categories);
  } catch (error) {
    if (error.code === 16) {
      console.error("Authentication error: Ensure valid Firebase credentials.", error);
      return errorResponse(res, 401, "Authentication error: Invalid Firebase credentials.");
    }
    console.error("Failed to fetch categories:", error);
    return errorResponse(res, 500, "Failed to fetch categories", error);
  }
};

/**
 * POST /admin/dishes/categories
 * Creates a new category and invalidates the cache.
 */
const createCategory = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return errorResponse(res, 400, "Category name is required");
  }

  try {
    const categoryRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(name);
    const doc = await categoryRef.get();

    if (doc.exists) {
      return errorResponse(res, 409, "Category already exists");
    }

    await categoryRef.set({
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    invalidateCategoryCache();

    return successResponse(res, 201, {
      message:      "Category created successfully",
      categoryId:   name,
      categoryName: name,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error);
  }
};

/**
 * DELETE /admin/dishes/categories/:category
 * Deletes a category (and all its dishes) and invalidates the cache.
 */
const deleteCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const categoryRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(category);

    const dishesSnapshot = await categoryRef
      .collection(COLLECTION_NAMES.DISHES)
      .get();

    const deletePromises = [];
    dishesSnapshot.forEach((dishDoc) => {
      const dishData = dishDoc.data();
      const imageUrl = dishData.image;
      deletePromises.push(dishDoc.ref.delete());
      if (imageUrl) deletePromises.push(deleteFile(imageUrl));
    });

    await Promise.all(deletePromises);
    await categoryRef.delete();

    invalidateCategoryCache();

    return successResponse(res, 200, {
      message: "Category and associated dishes deleted successfully",
    });
  } catch (error) {
    return errorResponse(res, 500, "Failed to delete category", error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
};
