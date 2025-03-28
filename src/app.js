// src/app.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const cartRoutes = require("./routes/cartRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const dishRoutes = require("./routes/dishRoutes");
const locationRoutes = require("./routes/locationRoutes");
const miniGameRoutes = require("./routes/miniGameRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const orderRoutes = require("./routes/orderRoutes");
const promoRoutes = require("./routes/promoRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Colors for console logs
const colors = {
  info: "\x1b[36m", // cyan
  error: "\x1b[31m", // red
  success: "\x1b[32m", // green
  reset: "\x1b[0m", // reset
};

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log request
  console.log(colors.info, `➡️ ${req.method} ${req.path}`, colors.reset);

  // Override res.send to log response
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;

    // Log response with status code and duration
    const statusColor = res.statusCode >= 400 ? colors.error : colors.success;
    console.log(
      statusColor,
      `⬅️ ${req.method} ${req.path} ${res.statusCode} [${duration}ms]`,
      colors.reset
    );

    originalSend.call(this, body);
  };

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(
    colors.error,
    `❌ Error: ${err.message}\n`,
    `Path: ${req.path}\n`,
    `Stack: ${err.stack}`,
    colors.reset
  );

  res.status(500).json({ error: "Internal Server Error" });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/cart", cartRoutes);
app.use("/categories", categoryRoutes);
app.use("/dishes", dishRoutes);
app.use("/locations", locationRoutes);
app.use("/miniGames", miniGameRoutes);
app.use("/notifications", notificationRoutes);
app.use("/orders", orderRoutes);
app.use("/promos", promoRoutes);
app.use("/rewards", rewardRoutes);
app.use("/users", userRoutes);

const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
