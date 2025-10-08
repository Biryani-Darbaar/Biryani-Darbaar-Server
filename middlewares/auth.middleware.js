const { AuthenticationError } = require("../utils/errors.util");
const {
  verifyAccessToken,
  extractTokenFromHeader,
} = require("../utils/jwt.util");
const { admin } = require("../config/firebase.config");

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    const decoded = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to authenticate Firebase ID tokens
 */
const authenticateFirebase = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request
    req.user = {
      userId: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      phoneNumber: decodedToken.phone_number,
    };

    next();
  } catch (error) {
    if (error.code === "auth/id-token-expired") {
      next(new AuthenticationError("Authentication token has expired"));
    } else if (error.code === "auth/invalid-id-token") {
      next(new AuthenticationError("Invalid authentication token"));
    } else if (error.code === "auth/argument-error") {
      next(new AuthenticationError("Invalid token format"));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
        };
      } catch (error) {
        // Token exists but invalid - continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AuthenticationError("Authentication required");
    }

    const { db } = require("../config/firebase.config");
    const { COLLECTION_NAMES } = require("../constants");

    const userDoc = await db
      .collection(COLLECTION_NAMES.USERS)
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new AuthenticationError("User not found");
    }

    const userData = userDoc.data();

    if (userData.role !== "admin") {
      throw new AuthenticationError("Admin access required");
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
  requireAdmin,
};
