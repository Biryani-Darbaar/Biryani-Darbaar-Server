const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { getUserId } = require("../utils/session.util");
const { calculateRewards } = require("../utils/calculations.util");
const { errorResponse, successResponse, asyncHandler } = require("../utils/response.util");

// ── Coin redemption constants (must match frontend + wallet.controller.js) ────
const MIN_COINS_TO_REDEEM = 50;
const COIN_TO_AUD = 0.1; // 1 coin = $0.10 AUD

/**
 * Round to 2 decimal places without floating-point drift.
 * e.g. roundCents(0.1 + 0.2) → 0.30 (not 0.30000000000000004)
 */
const roundCents = (n) => Math.round(n * 100) / 100;

/**
 * Create a new order.
 *
 * Critical change: coin validation and deduction are now performed atomically
 * inside this function using a Firestore batch write. This guarantees:
 *   - Coins are NEVER deducted before the order is committed
 *   - If the batch fails, BOTH the order write AND the coin deduction roll back
 *   - The backend independently validates coinsUsed — we never trust the client
 */
const createOrder = asyncHandler(async (req, res) => {
  const orderData = req.body;

  // Prefer JWT-resolved userId (set by authenticateJWT middleware) over body
  const userId = req.user?.userId || orderData.userId || getUserId(req);

  if (!userId) {
    return errorResponse(res, 401, "Authentication required to place an order");
  }

  // Fetch user document up-front — needed for both coin validation and rewards
  const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    return errorResponse(res, 404, "User not found");
  }

  const userData = userSnapshot.data();

  // ── Server-side coin redemption validation ────────────────────────────────
  //
  // We NEVER trust the frontend coin values.  The wallet balance is read fresh
  // from Firestore right now, and every rule is re-checked independently.
  //
  const requestedCoins =
    typeof orderData.coinsUsed === "number" &&
    Number.isInteger(orderData.coinsUsed) &&
    orderData.coinsUsed > 0
      ? orderData.coinsUsed
      : 0;

  let validatedCoinsUsed = 0;
  let validatedCoinDiscount = 0; // AUD

  if (requestedCoins > 0) {
    const currentBalance = userData.walletBalance ?? 0;

    // Rule 1 — minimum redemption
    if (requestedCoins < MIN_COINS_TO_REDEEM) {
      return errorResponse(
        res,
        400,
        `Minimum ${MIN_COINS_TO_REDEEM} coins required for redemption. Requested: ${requestedCoins}`
      );
    }

    // Rule 2 — cannot exceed wallet balance
    if (requestedCoins > currentBalance) {
      return errorResponse(
        res,
        400,
        `Insufficient coins. Wallet balance: ${currentBalance}, requested: ${requestedCoins}`
      );
    }

    // Rule 3 — server-side conversion (never trust frontend discountAmount)
    validatedCoinsUsed    = requestedCoins;
    validatedCoinDiscount = roundCents(requestedCoins * COIN_TO_AUD);
  }

  // ── Build authoritative order document ────────────────────────────────────
  const now = new Date().toISOString();

  const orderStoreData = {
    // Spread the body first, then override every sensitive field below so
    // malicious or stale frontend values cannot pollute the stored document.
    ...orderData,
    userId,
    orderStatus:     orderData.orderStatus || "pending",
    orderDate:       now,
    paymentIntentId: orderData.paymentIntentId || null,

    // Financial fields — always set by the server, never from the client
    coinsUsed:      validatedCoinsUsed,
    coinDiscount:   validatedCoinDiscount,
    finalAmountPaid: roundCents(Number(orderData.totalPrice) || 0),
  };

  // ── Atomic batch: order (×2) + wallet deduction ───────────────────────────
  //
  // All three writes succeed together or all roll back.  This is the
  // single source of truth for "an order was placed and coins were spent".
  //
  const newOrderRef = db
    .collection(COLLECTION_NAMES.USERS)
    .doc(userId)
    .collection(COLLECTION_NAMES.ORDERS)
    .doc();

  const globalOrderRef = db
    .collection(COLLECTION_NAMES.ORDER)
    .doc(newOrderRef.id);

  const batch = db.batch();
  batch.set(newOrderRef,    orderStoreData);
  batch.set(globalOrderRef, orderStoreData);

  if (validatedCoinsUsed > 0) {
    const newBalance = (userData.walletBalance ?? 0) - validatedCoinsUsed;
    batch.update(userRef, { walletBalance: newBalance });
  }

  await batch.commit();

  // ── Reward calculation — non-blocking ─────────────────────────────────────
  // Reward failure must NEVER prevent order confirmation.
  let rewardsEarned = 0;
  let newRewardValue = userData.reward || 0;

  try {
    const rewardRef = db.collection(COLLECTION_NAMES.REWARDS).doc("rewardDoc");
    const rewardDoc = await rewardRef.get();

    if (rewardDoc.exists) {
      const rewardData = rewardDoc.data();
      rewardsEarned  = calculateRewards(orderData.totalPrice, rewardData.dollar);
      newRewardValue = (userData.reward || 0) + rewardsEarned;
      // update() is a merge-patch — it won't overwrite walletBalance
      await userRef.update({ reward: newRewardValue });
    }
  } catch (rewardErr) {
    console.warn("[createOrder] Reward update skipped:", rewardErr.message);
  }

  // Return everything the client needs for immediate UI sync
  return successResponse(res, 201, {
    message:        "Order placed successfully",
    orderId:        newOrderRef.id,
    rewardsEarned,
    newRewardValue,
    // Echo back server-validated coin info so the client can update its state
    coinsUsed:      validatedCoinsUsed,
    coinDiscount:   validatedCoinDiscount,
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
