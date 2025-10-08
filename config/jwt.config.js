// JWT Configuration
const jwtConfig = {
  // Access token configuration
  access: {
    secret:
      process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Refresh token configuration
  refresh: {
    secret:
      process.env.JWT_REFRESH_SECRET ||
      "your_jwt_refresh_secret_key_here_change_in_production",
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // Options for token signing
  options: {
    issuer: "biryani-darbaar-api",
    audience: "biryani-darbaar-clients",
  },
};

module.exports = jwtConfig;
