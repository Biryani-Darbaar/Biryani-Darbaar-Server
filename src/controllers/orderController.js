const { db } = require("../config/firebase");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createOrder = async (req, res) => {
  try {
    const { userId, items, total, paymentMethod } = req.body;

    const payment = await stripe.paymentIntents.create({
      amount: total * 100, // Convert to cents
      currency: "inr",
      payment_method: paymentMethod,
      confirm: true,
    });

    const orderData = {
      userId,
      items,
      total,
      status: "pending",
      paymentId: payment.id,
      createdAt: new Date(),
    };

    const docRef = await db.collection("orders").add(orderData);
    res.status(201).json({ id: docRef.id, ...orderData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { userId } = req.query;
    const ordersQuery = userId
      ? db.collection("orders").where("userId", "==", userId)
      : db.collection("orders");

    const ordersSnapshot = await ordersQuery.orderBy("createdAt", "desc").get();
    const orders = [];
    ordersSnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.collection("orders").doc(id).update({ status });
    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
