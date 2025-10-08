/**
 * Environment Configuration Module
 * Centralized configuration management for all environments
 */

require("dotenv").config();

const ENV = process.env.NODE_ENV || "development";

const config = {
  // Environment
  env: ENV,
  isDevelopment: ENV === "development",
  isQA: ENV === "qa",
  isProduction: ENV === "production",

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 4200,
    apiBaseUrl:
      process.env.API_BASE_URL ||
      `http://localhost:${process.env.PORT || 4200}`,
    trustProxy: process.env.TRUST_PROXY === "true" || ENV === "production",
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || "dev_jwt_secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev_jwt_refresh_secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  // Firebase Configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json",
  },

  // Stripe Configuration
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  // Pushy Configuration
  pushy: {
    apiKey: process.env.PUSHY_API_KEY,
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || "dev_session_secret",
    maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000, // 24 hours
    name: "biryani.sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: ENV === "production",
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 86400000,
    },
  },

  // CORS Configuration
  cors: {
    enabled: process.env.CORS_ENABLED !== "false",
    origins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : ENV === "production"
      ? [
          "https://biryanidarbar.com",
          "https://www.biryanidarbar.com",
          "https://admin.biryanidarbar.com",
        ]
      : [
          "http://localhost:3000",
          "http://localhost:4200",
          "http://localhost:8080",
        ],
    credentials: true,
  },

  // Rate Limiting Configuration
  rateLimit: {
    enabled: process.env.ENABLE_RATE_LIMITING !== "false",
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    maxRequests:
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) ||
      (ENV === "production" ? 100 : 1000),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (ENV === "production" ? "error" : "debug"),
    enableRequestLogging:
      process.env.ENABLE_REQUEST_LOGGING === "true" || ENV !== "production",
    enableErrorStackTrace:
      process.env.ENABLE_ERROR_STACK_TRACE === "true" || ENV !== "production",
  },

  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || "10mb",
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(",").map((t) => t.trim())
      : ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },

  // Feature Flags
  features: {
    goldMembership: process.env.ENABLE_GOLD_MEMBERSHIP !== "false",
    miniGames: process.env.ENABLE_MINI_GAMES !== "false",
    rewards: process.env.ENABLE_REWARDS !== "false",
    notifications: process.env.ENABLE_NOTIFICATIONS !== "false",
  },

  // Cache Configuration
  cache: {
    enabled: process.env.ENABLE_CACHING !== "false",
    ttl: parseInt(process.env.CACHE_TTL, 10) || 600, // 10 minutes
  },

  // Debug Configuration
  debug: {
    enabled: process.env.DEBUG === "true" || ENV === "development",
    verbose: process.env.VERBOSE_LOGGING === "true" || ENV === "development",
  },

  // Email Configuration (Optional)
  email: {
    service: process.env.EMAIL_SERVICE,
    from: process.env.EMAIL_FROM,
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },

  // Database Configuration
  database: {
    useEmulator: process.env.USE_FIRESTORE_EMULATOR === "true",
    emulatorHost: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080",
  },
};

// Validation helper
const validateConfig = () => {
  const requiredFields = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "STRIPE_SECRET_KEY",
    "PUSHY_API_KEY",
    "SESSION_SECRET",
  ];

  const missing = requiredFields.filter((field) => !process.env[field]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing);
    if (ENV === "production") {
      throw new Error(
        "Cannot start in production without all required environment variables"
      );
    } else {
      console.warn(
        "⚠️  Warning: Some environment variables are missing. Using defaults."
      );
    }
  }
};

// Print configuration (safe - no secrets)
const printConfig = () => {
  console.log("\n📋 Configuration Loaded:");
  console.log(`   Environment: ${config.env}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   API Base URL: ${config.server.apiBaseUrl}`);
  console.log(`   CORS Origins: ${config.cors.origins.join(", ")}`);
  console.log(
    `   Rate Limit: ${config.rateLimit.maxRequests} req/${config.rateLimit.windowMs}ms`
  );
  console.log(`   Log Level: ${config.logging.level}`);
  console.log(
    `   Features: Gold=${config.features.goldMembership}, MiniGames=${config.features.miniGames}, Rewards=${config.features.rewards}`
  );
  console.log("");
};

// Auto-validate on import
if (ENV === "production") {
  validateConfig();
}

module.exports = {
  config,
  validateConfig,
  printConfig,
  ENV,
};
