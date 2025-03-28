const { db } = require("../config/firebase");

exports.addToCart = async (req, res) => {
  try {
    const { userId, item } = req.body;
    const cartRef = await db
      .collection("carts")
      .doc(userId)
      .collection("items")
      .add(item);
    res.status(201).json({ id: cartRef.id, ...item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCartContents = async (req, res) => {
  try {
    const { userId } = req.query;
    const cartSnapshot = await db
      .collection("carts")
      .doc(userId)
      .collection("items")
      .get();
    const items = [];
    cartSnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { userId } = req.query;
    const { id } = req.params;
    const updates = req.body;
    await db
      .collection("carts")
      .doc(userId)
      .collection("items")
      .doc(id)
      .update(updates);
    res.status(200).json({ message: "Cart item updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { userId } = req.query;
    const { id } = req.params;
    await db
      .collection("carts")
      .doc(userId)
      .collection("items")
      .doc(id)
      .delete();
    res.status(200).json({ message: "Item removed from cart successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
