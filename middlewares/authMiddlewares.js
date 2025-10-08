const {
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
} = require("./auth.middleware");

module.exports = {
  authenticateJWT,
  authenticateFirebase,
  optionalAuthenticate,
};
