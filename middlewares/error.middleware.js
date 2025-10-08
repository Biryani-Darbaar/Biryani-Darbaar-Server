const { errorResponse } = require("../utils/response.util");

/**
 * Global error handling middleware
 * This should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with request context
  console.error("[Error Handler]", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
  });

  // Send error response
  errorResponse(res, err);
};

/**
 * Handle 404 - Not Found errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  error.errorCode = "ROUTE_NOT_FOUND";
  next(error);
};

/**
 * Handle uncaught exceptions
 */
process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception]", {
    error: error.message,
    stack: error.stack,
  });

  // Give time for logging before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

/**
 * Handle unhandled promise rejections
 */
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection]", {
    reason,
    promise,
  });
});

module.exports = {
  errorHandler,
  notFoundHandler,
};
