const db = require('../config/database');

// Create a new order
exports.createOrder = async (req, res) => {
  const orderData = req.body;

  try {
    const orderRef = await db.collection('orders').add(orderData);
    res.status(201).json({ id: orderRef.id, ...orderData });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const ordersSnapshot = await db.collection('orders').get();
    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderDoc = await db.collection('orders').doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ id: orderDoc.id, ...orderDoc.data() });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

// Update an order
exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const orderRef = db.collection('orders').doc(id);
    await orderRef.update(updatedData);
    res.status(200).json({ message: "Order updated successfully" });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
};

// Delete an order
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection('orders').doc(id).delete();
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
};