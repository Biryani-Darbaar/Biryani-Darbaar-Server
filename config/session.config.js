// Session Configuration
const sessionConfig = {
  // Secret key for session
  secret: process.env.SESSION_SECRET || "secret",

  // Cookie configuration
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // Default: 24 hours in ms
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    httpOnly: true,
    sameSite: process.env.SESSION_SAME_SITE || "strict",
  },

  // Session options
  resave: false,
  saveUninitialized: false,
  name: process.env.SESSION_NAME || "biriyani.sid",
  rolling: true,
};

module.exports = sessionConfig;
