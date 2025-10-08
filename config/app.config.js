// Application Configuration
const appConfig = {
  // Rate limiting configuration
  rateLimit: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
  },

  // Feature flags
  features: {
    maxMiniGames: 6,
  },
};

module.exports = appConfig;
