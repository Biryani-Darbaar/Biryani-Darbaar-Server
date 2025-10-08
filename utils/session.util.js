const storage = require("node-sessionstorage");

/**
 * Get user ID from session storage or request body
 */
const getUserId = (req) => {
  let userId = storage.getItem("userId");
  if (!userId && req.body.userId) {
    userId = req.body.userId;
  }
  if (!userId && req.params.id) {
    userId = req.params.id;
  }
  return userId;
};

/**
 * Set user ID in session storage
 */
const setUserId = (userId) => {
  storage.setItem("userId", userId);
};

/**
 * Clear user ID from session storage
 */
const clearUserId = () => {
  storage.removeItem("userId");
};

module.exports = {
  getUserId,
  setUserId,
  clearUserId,
  storage,
};
