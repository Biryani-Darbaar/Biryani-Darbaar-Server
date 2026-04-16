// JWT Configuration
const jwtConfig = {
  // Access token: 7-day lifetime so admin sessions persist across shifts.
  // If JWT_EXPIRES_IN is set in the environment it takes precedence.
  access: {
    secret:
      process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Refresh token: 7-day session (Task 3). User stays logged in for 7 days.
  refresh: {
    secret:
      process.env.JWT_REFRESH_SECRET ||
      "your_jwt_refresh_secret_key_here_change_in_production",
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Options for token signing
  options: {
    issuer: "biryani-darbaar-api",
    audience: "biryani-darbaar-clients",
  },
};

module.exports = jwtConfig;
