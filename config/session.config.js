// Session Configuration
const sessionConfig = {
  // Secret key for session
  secret: process.env.SESSION_SECRET || "secret",

  // Cookie configuration
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    httpOnly: true,
    sameSite: "strict",
  },

  // Session options
  resave: false,
  saveUninitialized: false,
  name: "biriyani.sid",
  rolling: true,
};

module.exports = sessionConfig;
