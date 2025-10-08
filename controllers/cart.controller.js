const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { getUserId } = require("../utils/session.util");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Add item to cart
 */
const addToCart = async (req, res) => {
  let userId = getUserId(req);
  const cartItem = req.body;

  try {
    const cartRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.CART)
      .doc();
    const cartSnapshot = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.CART)
      .get();

    let itemExists = false;

    cartSnapshot.forEach((doc) => {
      const cartItemData = doc.data();
      if (cartItemData.dishId === cartItem.dishId) {
        itemExists = true;
        const newQuantity = cartItemData.quantity + cartItem.quantity;
        doc.ref.update({ quantity: newQuantity });
      }
    });

    if (!itemExists) {
      await cartRef.set(cartItem);
    }

    successResponse(res, 201, {
      message: "Item added to cart successfully",
      cartItemId: cartRef.id,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to add item to cart", error);
  }
};

/**
 * Get all cart items
 */
const getCart = async (req, res) => {
  let userId = getUserId(req);

  try {
    const cartSnapshot = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.CART)
      .get();
    const cartItems = [];

    cartSnapshot.forEach((doc) => {
      cartItems.push({ cartItemId: doc.id, ...doc.data() });
    });

    successResponse(res, 200, cartItems);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch cart items", error);
  }
};

/**
 * Update cart item
 */
const updateCartItem = async (req, res) => {
  let userId = getUserId(req);
  const cartItemId = req.params.id;
  const updatedCartItem = req.body;

  try {
    const cartRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.CART)
      .doc(cartItemId);
    await cartRef.update(updatedCartItem);

    successResponse(res, 200, { message: "Cart item updated successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to update cart item", error);
  }
};

/**
 * Delete cart item
 */
const deleteCartItem = async (req, res) => {
  let userId = getUserId(req);
  const cartItemId = req.params.id;

  try {
    const cartRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.CART)
      .doc(cartItemId);
    await cartRef.delete();

    successResponse(res, 200, { message: "Cart item deleted successfully" });
  } catch (error) {
    errorResponse(res, 500, "Failed to delete cart item", error);
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  deleteCartItem,
};
