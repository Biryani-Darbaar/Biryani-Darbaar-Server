const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { getUserId } = require("../utils/session.util");
const { calculateRewards } = require("../utils/calculations.util");
const { errorResponse, successResponse } = require("../utils/response.util");

/**
 * Create a new order
 */
const createOrder = async (req, res) => {
  const orderData = req.body;
  let userId = getUserId(req);

  const orderStoreData = {
    ...orderData,
    userId: userId,
  };

  try {
    // Get the user ID from the session ID
    const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
    const userSnapshot = await userRef.get();

    if (userSnapshot.empty) {
      return errorResponse(res, 404, "User not found");
    }

    // Store the order data in the user's orders collection
    const newOrderRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.ORDERS)
      .doc();
    await newOrderRef.set(orderData);

    const orderRef = db.collection(COLLECTION_NAMES.ORDER).doc(newOrderRef.id);
    await orderRef.set(orderStoreData);

    // Calculate rewards based on totalPrice
    const rewardRef = db.collection(COLLECTION_NAMES.REWARDS).doc("rewardDoc");
    const rewardDoc = await rewardRef.get();
    if (!rewardDoc.exists) {
      return errorResponse(res, 404, "Reward data not found");
    }

    const rewardData = rewardDoc.data();
    let dollarValue = 0;
    if (rewardData.reward === 1) {
      dollarValue = 10 * rewardData.dollar;
    } else {
      const localDollar = rewardData.dollar / rewardData.reward;
      dollarValue = 10 * localDollar;
    }

    const totalPrice = orderData.totalPrice;
    const rewardsEarned = calculateRewards(totalPrice, rewardData.dollar);
    const newRewardValue = (userSnapshot.data().reward || 0) + rewardsEarned;

    // Update user's reward value
    await userRef.update({ reward: newRewardValue });

    successResponse(res, 201, {
      message: "Order placed successfully",
      orderId: newOrderRef.id,
      orderData: orderStoreData,
      rewardsEarned,
      newRewardValue,
    });
  } catch (error) {
    errorResponse(res, 500, error.message || "Failed to place order", error);
  }
};

/**
 * Get all orders
 */
const getAllOrders = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION_NAMES.ORDER).get();
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ orderId: doc.id, ...doc.data() });
    });
    successResponse(res, 200, orders);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch orders", error);
  }
};

/**
 * Get orders by user
 */
const getOrdersByUser = async (req, res) => {
  let userId = getUserId(req);

  try {
    const snapshot = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.ORDERS)
      .get();
    const orders = [];
    snapshot.forEach((doc) => {
      orders.push({ orderId: doc.id, ...doc.data() });
    });
    successResponse(res, 200, orders);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch orders", error);
  }
};

/**
 * Get a specific order by ID
 */
const getOrderById = async (req, res) => {
  const orderId = req.params.id;
  let userId = getUserId(req);

  try {
    const orderRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.ORDERS)
      .doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return errorResponse(res, 404, "Order not found");
    }
    successResponse(res, 200, { orderId: orderDoc.id, ...orderDoc.data() });
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch order", error);
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  let userId = getUserId(req);
  const { orderStatus } = req.body;

  try {
    const userOrderRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.ORDERS)
      .doc(id);
    await userOrderRef.update({ orderStatus });

    const orderRef = db.collection(COLLECTION_NAMES.ORDER).doc(id);
    await orderRef.update({ orderStatus });

    successResponse(res, 200, "Order status updated");
  } catch (error) {
    errorResponse(res, 500, "Error updating order status", error);
  }
};

/**
 * Update order status by admin
 */
const updateOrderStatusAdmin = async (req, res) => {
  const { id } = req.params;
  const { orderStatus, userId } = req.body;

  try {
    const userOrderRef = db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.ORDERS)
      .doc(id);
    await userOrderRef.update({ orderStatus });

    const orderRef = db.collection(COLLECTION_NAMES.ORDER).doc(id);
    await orderRef.update({ orderStatus });

    successResponse(res, 200, "Order status updated");
  } catch (error) {
    errorResponse(res, 500, "Error updating order status", error);
  }
};

/**
 * Get total order count
 */
const getTotalOrderCount = async (req, res) => {
  try {
    const usersSnapshot = await db.collection(COLLECTION_NAMES.USERS).get();

    let totalOrderCount = 0;

    // Iterate through each user and fetch their orders collection
    for (const userDoc of usersSnapshot.docs) {
      const ordersSnapshot = await db
        .collection(COLLECTION_NAMES.USERS)
        .doc(userDoc.id)
        .collection(COLLECTION_NAMES.ORDERS)
        .get();
      totalOrderCount += ordersSnapshot.size;
    }

    successResponse(res, 200, { totalOrders: totalOrderCount });
  } catch (error) {
    errorResponse(res, 500, "Failed to count total orders", error);
  }
};

/**
 * Get daily summary of orders
 */
const getDailySummary = async (req, res) => {
  try {
    const ordersSnapshot = await db.collection(COLLECTION_NAMES.ORDER).get();
    const dailySummary = {};

    if (ordersSnapshot.empty) {
      return errorResponse(res, 404, "No orders found");
    }

    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      let orderDate;

      // Check if orderDate is a string or a Firestore Timestamp
      if (typeof orderData.orderDate === "string") {
        orderDate = new Date(orderData.orderDate).toISOString().split("T")[0];
      } else if (orderData.orderDate && orderData.orderDate.toDate) {
        orderDate = orderData.orderDate.toDate().toISOString().split("T")[0];
      } else {
        console.error("Unknown date format:", orderData.orderDate);
        return;
      }

      if (!dailySummary[orderDate]) {
        dailySummary[orderDate] = 0;
      }
      dailySummary[orderDate]++;
    });

    successResponse(res, 200, dailySummary);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch daily summary", error);
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrdersByUser,
  getOrderById,
  updateOrderStatus,
  updateOrderStatusAdmin,
  getTotalOrderCount,
  getDailySummary,
};
