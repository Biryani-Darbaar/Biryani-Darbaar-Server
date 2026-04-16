const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { successResponse, errorResponse } = require("../utils/response.util");

/**
 * Helper: get Firestore Timestamp N days ago
 */
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * [Admin] GET /admin/dashboard
 * Returns aggregated stats for the dashboard overview.
 */
const getDashboardStats = async (req, res) => {
  try {
    // ── 1. Total users ────────────────────────────────────────────────────────
    const usersSnap = await db.collection(COLLECTION_NAMES.USERS).get();
    const totalUsers = usersSnap.size;

    // ── 2. All orders (global collection) ────────────────────────────────────
    const ordersSnap = await db.collection(COLLECTION_NAMES.ORDER).get();
    const allOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalOrders = allOrders.length;

    // ── 3. Revenue — sum of all non-pending orders ────────────────────────────
    const totalRevenue = allOrders.reduce((sum, o) => {
      if (o.orderStatus && o.orderStatus !== "pending") {
        return sum + (Number(o.totalPrice) || 0);
      }
      return sum;
    }, 0);

    // ── 4. Active / live orders ───────────────────────────────────────────────
    const ACTIVE_STATUSES = ["confirmed", "preparing", "packed", "out_for_delivery"];
    const activeOrders = allOrders.filter((o) =>
      ACTIVE_STATUSES.includes(o.orderStatus)
    );

    // ── 5. Today's orders ─────────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = allOrders.filter((o) => {
      const ts = o.orderDate?.toDate?.() ?? (o.orderDate ? new Date(o.orderDate) : null);
      return ts && ts >= todayStart;
    });

    // ── 6. Daily orders chart — last 7 days ───────────────────────────────────
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = daysAgo(i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = allOrders.filter((o) => {
        const ts = o.orderDate?.toDate?.() ?? (o.orderDate ? new Date(o.orderDate) : null);
        return ts && ts >= dayStart && ts <= dayEnd;
      }).length;

      dailyData.push({
        date: dayStart.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
        orders: count,
      });
    }

    // ── 7. Monthly revenue chart — last 6 months ─────────────────────────────
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const monthStart = new Date(d);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthRevenue = allOrders
        .filter((o) => {
          const ts = o.orderDate?.toDate?.() ?? (o.orderDate ? new Date(o.orderDate) : null);
          return ts && ts >= monthStart && ts <= monthEnd && o.orderStatus !== "pending";
        })
        .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

      monthlyData.push({
        month: monthStart.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }),
        revenue: Math.round(monthRevenue * 100) / 100,
      });
    }

    // ── 8. Order status breakdown ─────────────────────────────────────────────
    const statusBreakdown = allOrders.reduce((acc, o) => {
      const s = o.orderStatus || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // ── 9. Recent orders (last 10) ────────────────────────────────────────────
    // recentOrders: allOrders already has orderDate as ISO strings (from allOrders map above)
    // but those were mapped with the old pattern — re-normalise with the shared helper.
    const recentOrders = ordersSnap.docs
      .map((d) => normaliseOrder(d.id, d.data()))
      .sort((a, b) => {
        const ta = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        const tb = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);

    return successResponse(res, 200, {
      totalUsers,
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeOrdersCount: activeOrders.length,
      todayOrdersCount: todayOrders.length,
      dailyData,
      monthlyData,
      statusBreakdown,
      recentOrders,
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return errorResponse(res, 500, "Failed to fetch dashboard stats", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Field-name normalisation helper
//
// Orders created by Checkout.tsx use these field names:
//   orderItems      → items          (frontend expects "items")
//   address         → deliveryAddress (frontend expects "deliveryAddress")
//   orderDate       → stored as ISO string, NOT Firestore Timestamp
//
// This helper is applied once per order document so every admin endpoint
// returns a consistent shape regardless of how/when the order was created.
// ─────────────────────────────────────────────────────────────────────────────
const normaliseOrder = (id, data) => {
  // ── Date: handle both ISO string and Firestore Timestamp ─────────────────
  let orderDate = null;
  if (data.orderDate) {
    if (typeof data.orderDate.toDate === "function") {
      // Firestore Timestamp (rare — createOrder stores ISO strings)
      orderDate = data.orderDate.toDate().toISOString();
    } else if (typeof data.orderDate === "string") {
      // Most common: already an ISO string — pass through unchanged
      orderDate = data.orderDate;
    }
  }

  // ── Items: Checkout sends "orderItems"; normalise to "items" ─────────────
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.orderItems)
    ? data.orderItems
    : [];

  // ── Address: Checkout sends "address"; normalise to "deliveryAddress" ────
  const deliveryAddress =
    data.deliveryAddress ?? data.address ?? null;

  return {
    ...data,
    id,
    orderDate,
    items,
    deliveryAddress,
  };
};

/**
 * [Admin] GET /admin/orders
 * All orders with optional filtering (status, userId, dateFrom, dateTo, limit)
 */
const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, userId, dateFrom, dateTo, limit = 100 } = req.query;

    let query = db.collection(COLLECTION_NAMES.ORDER).orderBy("orderDate", "desc");

    if (status) query = query.where("orderStatus", "==", status);
    if (userId) query = query.where("userId", "==", userId);

    const snap = await query.limit(parseInt(limit)).get();

    let orders = snap.docs.map((d) => normaliseOrder(d.id, d.data()));

    // Date filters — applied post-query (avoids requiring a composite Firestore index)
    if (dateFrom) {
      const from = new Date(dateFrom);
      orders = orders.filter((o) => o.orderDate && new Date(o.orderDate) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => o.orderDate && new Date(o.orderDate) <= to);
    }

    return successResponse(res, 200, { orders, total: orders.length });
  } catch (error) {
    console.error("getAllOrdersAdmin error:", error);
    return errorResponse(res, 500, "Failed to fetch orders", error);
  }
};



/**
 * [Admin] PATCH /admin/orders/:id
 * Update the status of any order (both global + user subcollection).
 * New statuses: confirmed | preparing | packed | out_for_delivery | delivered | cancelled
 */
const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, userId } = req.body;

    const VALID_STATUSES = [
      "pending",
      "confirmed",
      "preparing",
      "packed",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!orderStatus || !VALID_STATUSES.includes(orderStatus)) {
      return errorResponse(res, 400, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const globalRef = db.collection(COLLECTION_NAMES.ORDER).doc(id);
    const globalDoc = await globalRef.get();

    if (!globalDoc.exists) {
      return errorResponse(res, 404, "Order not found");
    }

    const orderData = globalDoc.data();
    const resolvedUserId = userId || orderData.userId;

    // Batch update — global collection + user subcollection
    const batch = db.batch();

    batch.update(globalRef, {
      orderStatus,
      updatedAt: new Date().toISOString(),
    });

    if (resolvedUserId) {
      const userOrderRef = db
        .collection(COLLECTION_NAMES.USERS)
        .doc(resolvedUserId)
        .collection(COLLECTION_NAMES.ORDERS)
        .doc(id);

      const userOrderDoc = await userOrderRef.get();
      if (userOrderDoc.exists) {
        batch.update(userOrderRef, { orderStatus, updatedAt: new Date().toISOString() });
      }
    }

    await batch.commit();

    return successResponse(res, 200, { id, orderStatus }, "Order status updated successfully");
  } catch (error) {
    console.error("updateOrderStatusAdmin error:", error);
    return errorResponse(res, 500, "Failed to update order status", error);
  }
};

/**
 * [Admin] GET /admin/users
 */
const getAllUsersAdmin = async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION_NAMES.USERS).get();

    const users = snap.docs.map((d) => {
      const data = d.data();
      // Never expose hashed password
      const { hashedPassword, ...safeData } = data;
      return {
        id: d.id,
        ...safeData,
        createdAt: safeData.createdAt?.toDate?.()?.toISOString() ?? null,
        lastLogin: safeData.lastLogin?.toDate?.()?.toISOString() ?? null,
      };
    });

    return successResponse(res, 200, { users, total: users.length });
  } catch (error) {
    console.error("getAllUsersAdmin error:", error);
    return errorResponse(res, 500, "Failed to fetch users", error);
  }
};

/**
 * [Admin] GET /admin/users/:id/orders
 */
const getUserOrdersAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const userDoc = await db.collection(COLLECTION_NAMES.USERS).doc(id).get();
    if (!userDoc.exists) {
      return errorResponse(res, 404, "User not found");
    }

    const ordersSnap = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(id)
      .collection(COLLECTION_NAMES.ORDERS)
      .orderBy("orderDate", "desc")
      .get();

    const orders = ordersSnap.docs.map((d) => normaliseOrder(d.id, d.data()));

    const { hashedPassword, ...userData } = userDoc.data();

    return successResponse(res, 200, {
      user: { id, ...userData },
      orders,
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error("getUserOrdersAdmin error:", error);
    return errorResponse(res, 500, "Failed to fetch user orders", error);
  }
};

module.exports = {
  getDashboardStats,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  getAllUsersAdmin,
  getUserOrdersAdmin,
};
