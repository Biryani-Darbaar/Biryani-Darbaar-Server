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
 * Add a new dish
 */
const addDish = asyncHandler(async (req, res) => {
  const dishData = JSON.parse(req.body.dishData);
  const file = req.file;
  const category = dishData.category;

  if (!category) {
    throw new ValidationError("Category is required");
  }

  let imageUrl = "";

  // Check if the category document exists, and if not, create it with a 'name' field
  const categoryDocRef = db.collection(COLLECTION_NAMES.CATEGORY).doc(category);
  const categoryDoc = await categoryDocRef.get();

  if (!categoryDoc.exists) {
    await categoryDocRef.set({ name: category });
  }

  // If an image is provided, upload it to Firebase Storage
  if (file) {
    imageUrl = await uploadFile(file, category, file.originalname);
  }

  const goldPriceRef = db
    .collection(COLLECTION_NAMES.GOLD_PRICE)
    .doc("current");
  const goldPriceDoc = await goldPriceRef.get();
  const goldPriceData = goldPriceDoc.data();
  const goldPrice = dishData.price * (goldPriceData.goldPrice / 100);

  // Remove the category field from dishData
  const { category: dishCategory, ...dishDataWithoutCategory } = dishData;

  // Store dish data and image URL in Firestore
  const timestamp = Date.now().toString();
  const newDishRef = db
    .collection(COLLECTION_NAMES.CATEGORY)
    .doc(category)
    .collection(COLLECTION_NAMES.DISHES)
    .doc(timestamp);

  const newDishData = {
    ...dishDataWithoutCategory,
    image: imageUrl,
    available: true,
    goldPrice,
  };

  await newDishRef.set(newDishData);

  successResponse(
    res,
    201,
    {
      dishId: newDishRef.id,
      imageUrl,
    },
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

  // Fetch dishes within the category
  const dishesSnapshot = await db
    .collection(COLLECTION_NAMES.CATEGORY)
    .doc(category)
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
    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(category)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    let imageUrl = dishData.image;

    if (file) {
      // Delete old image
      const oldDishData = dishDoc.data();
      const oldImageUrl = oldDishData.image;
      if (oldImageUrl) {
        await deleteFile(oldImageUrl);
      }

      // Upload new image
      imageUrl = await uploadFile(file, category, file.originalname);
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
    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(category)
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
    const dishesSnapshot = await db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(category)
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
  const updatedDishData = req.body;
  const file = req.file;

  try {
    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(category)
      .collection(COLLECTION_NAMES.DISHES)
      .doc(dishId);
    const dishDoc = await dishRef.get();

    if (!dishDoc.exists) {
      return errorResponse(res, 404, "Dish not found");
    }

    let imageUrl = updatedDishData.image;

    if (file) {
      // Delete old image
      const oldDishData = dishDoc.data();
      const oldImageUrl = oldDishData.image;
      if (oldImageUrl) {
        await deleteFile(oldImageUrl);
      }

      // Upload new image
      imageUrl = await uploadFile(file, category, file.originalname);

      const updatedDishDataWithImage = {
        ...updatedDishData,
        image: imageUrl,
      };
      await dishRef.update(updatedDishDataWithImage);

      return successResponse(res, 200, {
        message: "Dish updated successfully",
        imageUrl,
      });
    }

    const updatedDishDataWithoutImage = {
      ...updatedDishData,
    };

    await dishRef.update(updatedDishDataWithoutImage);
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
    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(category)
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
    const dishRef = db
      .collection(COLLECTION_NAMES.CATEGORY)
      .doc(category)
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
