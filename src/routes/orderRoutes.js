const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);
router.get("/total-count", orderController.getTotalOrderCount);
router.get("/byUser/:id", orderController.getOrdersByUser);
router.get("/:id", orderController.getOrderById);
router.patch("/:id", orderController.updateOrderStatus);
router.patch("/admin/:id", orderController.updateOrderStatusAdmin);
router.put("/status/:id", orderController.updateStatus);

module.exports = router;
