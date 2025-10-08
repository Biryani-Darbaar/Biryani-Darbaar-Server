const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Set gold price and update all dishes
 */
const setGoldPrice = async (req, res) => {
  const { goldPrice } = req.body;

  if (typeof goldPrice !== "number" || goldPrice < 0 || goldPrice > 100) {
    return errorResponse(res, 400, "Invalid gold price percentage");
  }

  try {
    const goldPriceRef = db
      .collection(COLLECTION_NAMES.GOLD_PRICE)
      .doc("current");
    await goldPriceRef.set({ goldPrice });

    const categoriesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .get();
    const updatePromises = [];

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const dishesSnapshot = await db
        .collection(COLLECTION_NAMES.CATEGORY)
        .doc(categoryId)
        .collection(COLLECTION_NAMES.DISHES)
        .get();

      dishesSnapshot.forEach((dishDoc) => {
        const dishData = dishDoc.data();
        const originalPrice = dishData.price;
        const newPrice =
          Math.round(
            (originalPrice - (originalPrice * goldPrice) / 100) * 100
          ) / 100;
        updatePromises.push(dishDoc.ref.update({ goldPrice: newPrice }));
      });
    }

    await Promise.all(updatePromises);
    successResponse(res, 201, { message: "Gold price updated successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to update gold price", error);
  }
};

/**
 * Get gold price
 */
const getGoldPrice = async (req, res) => {
  try {
    const goldPriceRef = db
      .collection(COLLECTION_NAMES.GOLD_PRICE)
      .doc("current");
    const goldPriceDoc = await goldPriceRef.get();

    if (!goldPriceDoc.exists) {
      return errorResponse(res, 404, "Gold price not found");
    }

    successResponse(res, 200, { goldPrice: goldPriceDoc.data().goldPrice });
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch gold price", error);
  }
};

/**
 * Apply gold discount to all dishes
 */
const applyGoldDiscountToAll = async (req, res) => {
  try {
    const goldPriceRef = db
      .collection(COLLECTION_NAMES.GOLD_PRICE)
      .doc("current");
    const goldPriceDoc = await goldPriceRef.get();
    const goldPriceData = goldPriceDoc.data();
    const categoriesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .get();

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const dishesSnapshot = await db
        .collection(COLLECTION_NAMES.CATEGORY)
        .doc(categoryId)
        .collection(COLLECTION_NAMES.DISHES)
        .get();

      const updatePromises = [];
      dishesSnapshot.forEach((dishDoc) => {
        const dishData = dishDoc.data();
        const originalPrice = dishData.price;
        const goldPrice =
          originalPrice - (originalPrice * goldPriceData.goldPrice) / 100;
        updatePromises.push(dishDoc.ref.update({ goldPrice }));
      });

      await Promise.all(updatePromises);
    }

    successResponse(res, 200, {
      message: "Discount applied successfully to all dishes",
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to apply discount", error);
  }
};

/**
 * Update dishes gold price by category
 */
const updateDishesGoldPrice = async (req, res) => {
  const { category, discountValue } = req.body;

  if (!category || !discountValue) {
    return errorResponse(res, 400, "Category and discount value are required");
  }

  try {
    const categoryRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(category);
    const dishesSnapshot = await categoryRef
      .collection(COLLECTION_NAMES.DISHES)
      .get();

    if (dishesSnapshot.empty) {
      return errorResponse(
        res,
        404,
        "No dishes found in the specified category"
      );
    }

    const updatePromises = [];
    dishesSnapshot.forEach((dishDoc) => {
      const dishData = dishDoc.data();
      const originalPrice = dishData.price;
      const newPrice = originalPrice - (originalPrice * discountValue) / 100;
      updatePromises.push(dishDoc.ref.update({ goldPrice: newPrice }));
    });

    await Promise.all(updatePromises);
    successResponse(res, 200, { message: "Prices updated successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to update prices", error);
  }
};

module.exports = {
  setGoldPrice,
  getGoldPrice,
  applyGoldDiscountToAll,
  updateDishesGoldPrice,
};
