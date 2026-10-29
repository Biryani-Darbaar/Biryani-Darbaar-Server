const { errorResponse } = require("../utils/response.util");
const { NotFoundError } = require("../utils/errors.util");

/**
 * Global error handling middleware
 * This should be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Client errors (4xx) are expected traffic — log one line, not a stack trace
  const status = err.statusCode || err.status;
  if (status >= 400 && status < 500) {
    console.warn(`[${status}] ${req.method} ${req.originalUrl} — ${err.message}`);
    return errorResponse(res, err);
  }

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
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
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
