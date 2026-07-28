const express = require("express");
const router = express.Router();
const rewardController = require("../controllers/reward.controller");
const { authenticateJWT, requireAdmin } = require("../middlewares");

// Reward routes
router.post(
  "/rewards",
  authenticateJWT,
  requireAdmin,
  rewardController.createOrUpdateReward
);
router.get(
  "/rewards",
  authenticateJWT,
  requireAdmin,
  rewardController.getRewards
);
router.post(
  "/apply-reward",
  authenticateJWT,
  rewardController.applyReward
);

module.exports = router;
