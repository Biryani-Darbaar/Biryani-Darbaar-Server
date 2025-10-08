require("dotenv").config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const cacheController = require("express-cache-controller");

const corsOptions = require("./config/cors.config");
const { consoleLogger, cacheMiddleware } = require("./middlewares");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");
const initRoutes = require("./routes");
const { PORT } = require("./constants");

const app = express();

// Trust proxy - important for getting correct client IP behind reverse proxy
app.set("trust proxy", 1);

// Middleware setup
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// CORS Configuration
app.use(cors(corsOptions));

// Disable etag and caching
app.set("etag", false);
app.set({ viewEngine: "ejs", cache: false });

// Request logging - only console output
app.use(consoleLogger);

// Cache control
app.use(cacheMiddleware);

// Session management
app.use(session(require("./config").session));

// Cache controller
app.use(cacheController({ noCache: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
initRoutes(app);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
}); // Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
