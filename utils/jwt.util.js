const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("./errors.util");
const { jwt: jwtConfig } = require("../config");

/**
 * Generate access token
 */
const generateAccessToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: "access",
  };

  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
    ...jwtConfig.options,
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

  return jwt.sign(payload, jwtConfig.refresh.secret, {
    expiresIn: jwtConfig.refresh.expiresIn,
    ...jwtConfig.options,
  });
};

/**
 * Generate both access and refresh tokens
 */
const generateTokens = (userId, email) => {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId),
    expiresIn: jwtConfig.access.expiresIn,
  };
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.access.secret);

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
    const decoded = jwt.verify(token, jwtConfig.refresh.secret);

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
