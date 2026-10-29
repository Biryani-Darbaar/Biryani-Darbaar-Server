const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { getUserId } = require("../utils/session.util");
const { errorResponse, successResponse, asyncHandler } = require("../utils/response.util");
const checkout = require("../lib/checkout.lib");

/**
 * POST /orders — body: { paymentIntentId }
 *
 * Orders are only ever created from a Stripe PaymentIntent that has SUCCEEDED,
 * for the exact server-quoted amount. Everything about the order (items, prices,
 * fees, discounts, address) comes from the quote saved when the payment was
 * created — nothing from this request body is trusted. Idempotent: calling it
 * again (or the Stripe webhook firing) returns the same order.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { orderId, created } = await checkout.finalizeCheckout(req.body?.paymentIntentId, {
    expectedUserId: req.user.userId,
  });
  return successResponse(res, created ? 201 : 200, {
    message: created ? "Order placed successfully" : "Order already placed",
    orderId,
  });
});

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
 * Get orders by user — prefers JWT userId, falls back to param for admin lookups
 */
const getOrdersByUser = async (req, res) => {
  const userId = req.user?.userId || req.params.id;

  if (!userId) {
    return errorResponse(res, 400, "User ID is required");
  }

  try {
    const snapshot = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .collection(COLLECTION_NAMES.ORDERS)
      .orderBy("orderDate", "desc")
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
  const userId  = req.user?.userId;

  if (!userId) {
    return errorResponse(res, 401, "Authentication required");
  }

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
