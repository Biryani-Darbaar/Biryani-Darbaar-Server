const { AppError } = require("./errors.util");

/**
 * Success response handler
 */
const successResponse = (res, statusCode, data, message = null) => {
  const response = {
    success: true,
    statusCode,
    data,
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * Error response handler
 */
const errorResponse = (
  res,
  statusCodeOrError,
  message = null,
  error = null
) => {
  // New signature: errorResponse(res, error)
  if (
    typeof statusCodeOrError === "object" &&
    statusCodeOrError instanceof Error
  ) {
    const err = statusCodeOrError;
    return handleErrorResponse(res, err);
  }

  // Old signature: errorResponse(res, statusCode, message, error)
  // Convert to AppError and handle
  const statusCode = statusCodeOrError;
  const actualError = error || new Error(message);

  // Create appropriate AppError based on status code
  let appError;
  if (statusCode === 400) {
    appError = new (require("./errors.util").ValidationError)(message);
  } else if (statusCode === 401) {
    appError = new (require("./errors.util").AuthenticationError)(message);
  } else if (statusCode === 404) {
    appError = new (require("./errors.util").NotFoundError)(message);
  } else if (statusCode === 409) {
    appError = new (require("./errors.util").ConflictError)(message);
  } else {
    appError = new AppError(message, statusCode, "INTERNAL_SERVER_ERROR");
  }

  // Log the original error if provided
  if (error) {
    console.error(`[Error Context]`, {
      originalError: error.message,
      stack: error.stack,
    });
  }

  return handleErrorResponse(res, appError);
};

/**
 * Internal error handler
 */
const handleErrorResponse = (res, error) => {
  // Handle AppError instances
  if (error instanceof AppError) {
    const response = {
      success: false,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      message: error.message,
      timestamp: error.timestamp,
    };

    // Add validation errors if present
    if (error.errors && error.errors.length > 0) {
      response.errors = error.errors;
    }

    // Log operational errors
    if (error.isOperational) {
      console.warn(`[Operational Error] ${error.errorCode}: ${error.message}`, {
        statusCode: error.statusCode,
        errorCode: error.errorCode,
      });
    } else {
      console.error(`[System Error] ${error.errorCode}: ${error.message}`, {
        stack: error.stack,
      });
    }

    return res.status(error.statusCode).json(response);
  }

  // Handle Firebase errors
  if (
    error.code &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  ) {
    const firebaseErrors = {
      "auth/email-already-exists": {
        message: "Email address is already in use",
        statusCode: 409,
      },
      "auth/invalid-email": {
        message: "Invalid email address",
        statusCode: 400,
      },
      "auth/invalid-password": {
        message: "Password must be at least 6 characters",
        statusCode: 400,
      },
      "auth/user-not-found": {
        message: "User not found",
        statusCode: 404,
      },
      "auth/wrong-password": {
        message: "Incorrect password",
        statusCode: 401,
      },
      "auth/id-token-expired": {
        message: "Authentication token expired",
        statusCode: 401,
      },
      "auth/invalid-id-token": {
        message: "Invalid authentication token",
        statusCode: 401,
      },
    };

    const errorInfo = firebaseErrors[error.code] || {
      message: error.message,
      statusCode: 500,
    };

    console.warn(`[Firebase Error] ${error.code}: ${errorInfo.message}`);

    return res.status(errorInfo.statusCode).json({
      success: false,
      statusCode: errorInfo.statusCode,
      errorCode: "FIREBASE_ERROR",
      message: errorInfo.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Firebase/gRPC UNAUTHENTICATED errors
  if (error.message && error.message.includes("UNAUTHENTICATED")) {
    console.error("[Firebase Auth Error] Invalid service account credentials");
    return res.status(500).json({
      success: false,
      statusCode: 500,
      errorCode: "FIREBASE_AUTH_ERROR",
      message:
        "Firebase authentication failed. Please check service account credentials.",
      timestamp: new Date().toISOString(),
    });
  }

  // Handle numeric gRPC error codes
  if (typeof error.code === "number") {
    const grpcErrors = {
      16: "Firebase authentication failed - Invalid credentials",
    };

    const message = grpcErrors[error.code] || error.message;
    console.error(`[gRPC Error] Code ${error.code}: ${message}`);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      errorCode: "FIREBASE_ERROR",
      message: "Database connection error. Please contact support.",
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Stripe errors
  if (error.type && error.type.startsWith("Stripe")) {
    console.error(`[Stripe Error] ${error.type}: ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      errorCode: "PAYMENT_ERROR",
      message: error.message || "Payment processing failed",
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Mongoose/MongoDB errors
  if (error.name === "MongoError" || error.name === "MongoServerError") {
    console.error(`[Database Error] ${error.message}`, { code: error.code });

    return res.status(500).json({
      success: false,
      statusCode: 500,
      errorCode: "DATABASE_ERROR",
      message: "Database operation failed",
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    console.warn(`[JSON Parse Error] ${error.message}`);

    return res.status(400).json({
      success: false,
      statusCode: 400,
      errorCode: "JSON_PARSE_ERROR",
      message: "Invalid JSON in request body",
      timestamp: new Date().toISOString(),
    });
  }

  // Default error handler for unexpected errors
  console.error(`[Unexpected Error] ${error.message}`, {
    stack: error.stack,
    name: error.name,
  });

  // Don't expose internal error details in production
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : error.message;

  return res.status(500).json({
    success: false,
    statusCode: 500,
    errorCode: "INTERNAL_SERVER_ERROR",
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorResponse,
  successResponse,
  asyncHandler,
};
