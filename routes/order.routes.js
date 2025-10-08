const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { authenticateJWT } = require("../middlewares");

// Order routes - All require authentication
router.post("/orders", authenticateJWT, orderController.createOrder);
router.get("/orders", authenticateJWT, orderController.getAllOrders);
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
router.get(
  "/orders/total-count",
  authenticateJWT,
  orderController.getTotalOrderCount
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
