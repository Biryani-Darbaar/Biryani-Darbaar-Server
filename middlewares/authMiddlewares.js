const {
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
  requireAdmin,
} = require("./auth.middleware");

module.exports = {
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
  requireAdmin,
};
