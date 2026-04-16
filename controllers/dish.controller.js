const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { uploadFile, deleteFile } = require("../utils/storage.util");
const {
  successResponse,
  errorResponse,
  asyncHandler,
} = require("../utils/response.util");
const { ValidationError, NotFoundError } = require("../utils/errors.util");
const { getUserId } = require("../utils/session.util");


/**
 * Helper: Find a category document by its 'name' field
 * This allows querying by category name even if the document ID is different
 */
const findCategoryByName = async (categoryName) => {
  // First try: assume document ID equals name (most common case)
  const directRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(categoryName);
  const directDoc = await directRef.get();
  
  if (directDoc.exists) {
    return directDoc;
  }
  
  // Fallback: query by 'name' field via .where()
  const querySnapshot = await db
    .collection(COLLECTION_NAMES.CATEGORY)
    .where("name", "==", categoryName)
    .limit(1)
    .get();
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0];
  }
  
  // Not found
  return null;
};

/**
 * Add a new dish
 */
const addDish = asyncHandler(async (req, res) => {
  // Parse dishData JSON from multipart body (sent by admin frontend)
  let dishData;
  try {
    dishData = JSON.parse(req.body.dishData);
  } catch {
    throw new ValidationError("Invalid dishData — expected a JSON string in req.body.dishData");
  }

  const file     = req.file;
  const category = dishData.category;

  if (!category) {
    throw new ValidationError("Category is required");
  }

  // ── Ensure category document exists in Firestore ─────────────────────────
  const categoryDocRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(category);
  const categoryDoc    = await categoryDocRef.get();
  if (!categoryDoc.exists) {
    await categoryDocRef.set({ name: category });
  }

  // ── Upload image to local disk ───────────────────────────────────────────
  // Stored at  public/assets/dishes/<category>/<timestamp>-<filename>
  // Served at  {SERVER_BASE_URL}/assets/dishes/<category>/<timestamp>-<filename>
  let imageUrl = "";
  if (file) {
    imageUrl = await uploadFile(file, `dishes/${category}`, file.originalname);
  }

  // ── Gold price calculation (null-safe) ───────────────────────────────────
  // The goldprice/current document is optional — fall back to regular price
  // if the document is missing or the goldPrice field isn't set.
  let goldPrice = Number(dishData.price) || 0;
  try {
    const goldPriceDoc = await db
      .collection(COLLECTION_NAMES.GOLD_PRICE)
      .doc("current")
      .get();
    if (goldPriceDoc.exists) {
      const gp = goldPriceDoc.data()?.goldPrice;
      if (typeof gp === "number" && gp > 0) {
        // goldPrice field stores the percentage members pay (e.g. 90 → 10 % off)
        goldPrice = Number(dishData.price) * (gp / 100);
      }
    }
  } catch (err) {
    // Non-fatal: gold price lookup failure must not block dish creation.
    console.warn("Could not fetch gold price — defaulting goldPrice to regular price:", err.message);
  }

  // ── Write dish document to Firestore ─────────────────────────────────────
  // Remove category from the stored fields (it is implicit in the doc path).
  const { category: _cat, ...dishFields } = dishData;

  const timestamp  = Date.now().toString();
  const newDishRef = db
    .collection(COLLECTION_NAMES.CATEGORY)
    .doc(category)
    .collection(COLLECTION_NAMES.DISHES)
    .doc(timestamp);

  await newDishRef.set({
    ...dishFields,
    image:     imageUrl,
    available: true,
    goldPrice,
  });

  successResponse(
    res,
    201,
    { dishId: newDishRef.id, imageUrl },
    "Dish added successfully"
  );
});

/**
 * Get dishes by category
 */
const getDishesByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;
  const userId = getUserId(req);

  let user = null;

  // Fetch user data if userId exists
  if (userId) {
    const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      throw new NotFoundError("User");
    }
    user = userSnapshot.data();
  }

  // Find category by name (handles both doc ID and name field matching)
  const categoryDoc = await findCategoryByName(category);
  if (!categoryDoc) {
    throw new NotFoundError(`Category: ${category}`);
  }

  // Fetch dishes within the category
  const dishesSnapshot = await db
    .collection(COLLECTION_NAMES.CATEGORY)
    .doc(categoryDoc.id)
    .collection(COLLECTION_NAMES.DISHES)
    .get();

  const dishes = [];

  dishesSnapshot.forEach((doc) => {
    const dish = doc.data();
    if (dish.available) {
      if (userId && user?.goldMember) {
        const { goldPrice, ...rest } = dish;
        dishes.push({ dishId: doc.id, ...rest, price: goldPrice });
      } else {
        const { goldPrice, ...rest } = dish;
        dishes.push({ dishId: doc.id, ...rest });
      }
    }
  });

  successResponse(res, 200, dishes);
});

/**
 * Get all dishes
 */
const getAllDishes = async (req, res) => {
  const userId = getUserId(req);

  try {
    const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
    const userSnapshot = await userRef.get();
    if (!userSnapshot.exists) {
      return errorResponse(res, 404, "User not found");
    }
    const user = userSnapshot.data();
    const categoriesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .get();
    const allDishes = [];

    if (categoriesSnapshot.empty) {
      console.log("No categories found in Firestore.");
      return errorResponse(res, 404, "No categories found.");
    }

    // Loop through each category to fetch dishes
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const categoryName = categoryDoc.data().categoryName;
      console.log(`Fetching dishes for category: ${categoryName}`);

      // Fetch all dishes from the current category's subcollection
      const dishesSnapshot = await db
        .collection(COLLECTION_NAMES.CATEGORY)
        .doc(categoryId)
        .collection(COLLECTION_NAMES.DISHES)
        .get();

      if (dishesSnapshot.empty) {
        console.log(`No dishes found in category: ${categoryName}`);
      } else {
        dishesSnapshot.forEach((dishDoc) => {
          const dish = dishDoc.data();
          if (user.goldMember) {
            const { goldPrice, ...rest } = dish;
            allDishes.push({
              dishId: dishDoc.id,
              category: categoryName,
              ...rest,
              price: goldPrice,
            });
          } else {
            const { goldPrice, ...rest } = dish;
            allDishes.push({
              dishId: dishDoc.id,
              category: categoryName,
              ...rest,
            });
          }
        });
      }
    }

    // Check if we found any dishes
    if (allDishes.length === 0) {
      console.log("No dishes found.");
      return errorResponse(res, 404, "No dishes found.");
    }

    successResponse(res, 200, allDishes);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch dishes", error);
  }
};

/**
 * Update a dish
 */
const updateDish = async (req, res) => {
  const { category, id: dishId } = req.params;
  const dishData = JSON.parse(req.body.dishData);
  const file = req.file;

  try {
    // Find category by name (handles both doc ID and name field matching)
    const categoryDoc = await findCategoryByName(category);
    if (!categoryDoc) {
      return errorResponse(res, 404, `Category not found: ${category}`);
    }

    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(categoryDoc.id)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    let imageUrl = dishData.image;

    if (file) {
      // Remove the old image from disk (no-ops for old Firebase Storage URLs)
      const oldImageUrl = dishDoc.data().image;
      if (oldImageUrl) await deleteFile(oldImageUrl);

      // Save new image to  public/assets/dishes/<category>/
      imageUrl = await uploadFile(file, `dishes/${category}`, file.originalname);
    }

    // Prepare the updated dish data
    const updatedDishData = {
      ...dishData,
      image: imageUrl,
    };

    // Update the dish document in Firestore
    await dishRef.update(updatedDishData);

    successResponse(res, 200, {
      message: "Dish updated successfully",
      imageUrl,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to update dish", error);
  }
};

/**
 * Delete a dish
 */
const deleteDish = async (req, res) => {
  const { category, id: dishId } = req.params;

  try {
    // Find category by name (handles both doc ID and name field matching)
    const categoryDoc = await findCategoryByName(category);
    if (!categoryDoc) {
      return errorResponse(res, 404, `Category not found: ${category}`);
    }

    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(categoryDoc.id)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    const dishData = dishDoc.data();
    const imageUrl = dishData.image;

    // Delete the dish document
    await dishRef.delete();

    // If an image URL exists, delete the image from Firebase Storage
    if (imageUrl) {
      await deleteFile(imageUrl);
    }

    successResponse(res, 200, { message: "Dish deleted successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to delete dish", error);
  }
};

/**
 * Get dishes by category for admin
 */
const getDishesByCategoryAdmin = async (req, res) => {
  const category = req.params.category;

  try {
    // Find category by name (handles both doc ID and name field matching)
    const categoryDoc = await findCategoryByName(category);
    if (!categoryDoc) {
      return errorResponse(res, 404, `Category not found: ${category}`);
    }

    const dishesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(categoryDoc.id)
      .collection(COLLECTION_NAMES.DISHES)
      .get();
    const dishes = [];
    dishesSnapshot.forEach((doc) => {
      dishes.push({ dishId: doc.id, ...doc.data() });
    });
    successResponse(res, 200, dishes);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch dishes", error);
  }
};

/**
 * Update dish by admin
 */
const updateDishAdmin = async (req, res) => {
  const { category, id: dishId } = req.params;
  const file = req.file;

  try {
    // Find category by name (handles both doc ID and name field matching)
    const categoryDoc = await findCategoryByName(category);
    if (!categoryDoc) {
      return errorResponse(res, 404, `Category not found: ${category}`);
    }

    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(categoryDoc.id)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    // Coerce types: multipart sends strings; JSON body already has correct types.
    const raw = req.body;
    const updatedDishData = { ...raw };
    if (raw.price !== undefined)     updatedDishData.price     = parseFloat(raw.price) || raw.price;
    if (raw.available !== undefined) updatedDishData.available = raw.available === "true" || raw.available === true;

    let imageUrl = updatedDishData.image;

    if (file) {
      // Remove old image from disk (no-ops for old Firebase Storage URLs)
      const oldImageUrl = dishDoc.data().image;
      if (oldImageUrl) await deleteFile(oldImageUrl);

      // Save new image to  public/assets/dishes/<category>/
      imageUrl = await uploadFile(file, `dishes/${category}`, file.originalname);

      await dishRef.update({ ...updatedDishData, image: imageUrl });

      return successResponse(res, 200, {
        message: "Dish updated successfully",
        imageUrl,
      });
    }

    await dishRef.update(updatedDishData);
    successResponse(res, 200, {
      message: "Dish updated successfully",
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to update dish", error);
  }
};

/**
 * Apply discount to a dish
 */
const applyDiscount = async (req, res) => {
  const { category, id: dishId } = req.params;
  const { discount } = req.body;

  if (!discount) {
    return errorResponse(res, 400, "Discount value is required");
  }

  try {
    // Find category by name (handles both doc ID and name field matching)
    const categoryDoc = await findCategoryByName(category);
    if (!categoryDoc) {
      return errorResponse(res, 404, `Category not found: ${category}`);
    }

    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(categoryDoc.id)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    await dishRef.update({
      offerAvailable: true,
      discount: discount,
    });

    successResponse(res, 200, {
      message: "Discount applied successfully",
      discount,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to apply discount", error);
  }
};

/**
 * Get special offers
 */
const getSpecialOffers = async (req, res) => {
  try {
    const categoriesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .get();
    const specialOffers = [];

    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryId = categoryDoc.id;
      const dishesSnapshot = await db
        .collection(COLLECTION_NAMES.CATEGORY)
        .doc(categoryId)
        .collection(COLLECTION_NAMES.DISHES)
        .where("offerAvailable", "==", true)
        .get();

      dishesSnapshot.forEach((dishDoc) => {
        const dishData = dishDoc.data();
        if (dishData.available) {
          const discountedPrice =
            Math.round(
              (dishData.price - (dishData.price * dishData.discount) / 100) *
                100
            ) / 100;
          specialOffers.push({
            dishId: dishDoc.id,
            category: categoryId,
            ...dishData,
            price: discountedPrice,
          });
        }
      });
    }

    successResponse(res, 200, specialOffers);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch special offers", error);
  }
};

/**
 * Toggle dish availability
 */
const toggleAvailability = async (req, res) => {
  const { category, id } = req.body;

  if (!category || !id) {
    return errorResponse(res, 400, "Category and ID are required");
  }

  try {
    // Find category by name (handles both doc ID and name field matching)
    const categoryDoc = await findCategoryByName(category);
    if (!categoryDoc) {
      return errorResponse(res, 404, `Category not found: ${category}`);
    }

    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(categoryDoc.id)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(id);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    const currentAvailability = dishDoc.data().available;
    const newAvailability = !currentAvailability;

    await dishRef.update({ available: newAvailability });

    successResponse(res, 200, {
      message: "Dish availability updated successfully",
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to update dish availability", error);
  }
};

module.exports = {
  addDish,
  getDishesByCategory,
  getAllDishes,
  updateDish,
  deleteDish,
  getDishesByCategoryAdmin,
  updateDishAdmin,
  applyDiscount,
  getSpecialOffers,
  toggleAvailability,
};
