const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { authenticateJWT } = require("../middlewares");

// Order routes - All require authentication
router.post("/orders", authenticateJWT, orderController.createOrder);
// GET /orders — returns orders for the authenticated user (JWT-resolved)
router.get("/orders", authenticateJWT, orderController.getOrdersByUser);
// GET /orders/admin — admin-only view of all orders across all users
router.get("/orders/admin", authenticateJWT, orderController.getAllOrders);
// Static routes MUST be declared before parameterised routes to avoid being
// swallowed by the :id wildcard.
router.get(
  "/orders/total-count",
  authenticateJWT,
  orderController.getTotalOrderCount
);
router.get(
  "/ordersByUser/:id",
  authenticateJWT,
  orderController.getOrdersByUser
);
router.get("/orders/:id", authenticateJWT, orderController.getOrderById);
router.patch("/orders/:id", authenticateJWT, orderController.updateOrderStatus);
router.patch(
  "/ordersAdmin/:id",
  authenticateJWT,
  orderController.updateOrderStatusAdmin
);

// Order status update endpoint (alternative route)
router.put(
  "/order/status/:id",
  authenticateJWT,
  orderController.updateOrderStatusAdmin
);

// Analytics
router.get("/daily-summary", authenticateJWT, orderController.getDailySummary);

module.exports = router;
