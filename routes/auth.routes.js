const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const authController = require("../controllers/auth.controller");
const {
  authenticateJWT,
  optionalAuthenticate,
  requireAdmin,
} = require("../middlewares");

// Public auth routes
router.post("/register", authController.register);
router.post("/signup", authController.signup); // Alias for backward compatibility
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);

// Protected auth routes
router.post("/logout", optionalAuthenticate, authController.logout);
router.post("/change-password", authenticateJWT, authController.changePassword);

// User routes
router.get("/user/:id", authController.getUserById);
router.put("/user/:id", authenticateJWT, authController.updateUser);
router.get(
  "/getUsers",
  authenticateJWT,
  requireAdmin,
  authController.getAllUsers
);
router.post(
  "/userImg",
  authenticateJWT,
  upload.single("image"),
  authController.uploadUserImage
);
router.put(
  "/user/goldMember/:id",
  authenticateJWT,
  requireAdmin,
  authController.updateToGoldMember
);
router.get("/userReward", authenticateJWT, authController.getUserReward);

module.exports = router;
