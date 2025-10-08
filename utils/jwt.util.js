const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("./errors.util");

/**
 * Generate access token
 */
const generateAccessToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: "access",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "biryani-darbar-api",
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: "refresh",
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    issuer: "biryani-darbar-api",
  });
};

/**
 * Generate both access and refresh tokens
 */
const generateTokens = (userId, email) => {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "access") {
      throw new AuthenticationError("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Access token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid access token");
    }
    throw error;
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== "refresh") {
      throw new AuthenticationError("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AuthenticationError("Refresh token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new AuthenticationError("Invalid refresh token");
    }
    throw error;
  }
};

/**
 * Extract token from request headers
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new AuthenticationError("Invalid authorization header format");
  }

  return parts[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
};
