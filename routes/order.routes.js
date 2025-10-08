const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");

// Order routes
router.post("/orders", orderController.createOrder);
router.get("/orders", orderController.getAllOrders);
router.get("/ordersByUser/:id", orderController.getOrdersByUser);
router.get("/orders/:id", orderController.getOrderById);
router.patch("/orders/:id", orderController.updateOrderStatus);
router.patch("/ordersAdmin/:id", orderController.updateOrderStatusAdmin);
router.get("/orders/total-count", orderController.getTotalOrderCount);

// Order status update endpoint (alternative route)
router.put("/order/status/:id", orderController.updateOrderStatusAdmin);

// Analytics
router.get("/daily-summary", orderController.getDailySummary);

module.exports = router;
