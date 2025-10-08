const express = require("express");
const router = express.Router();
const rewardController = require("../controllers/reward.controller");

// Reward routes
router.post("/rewards", rewardController.createOrUpdateReward);
router.get("/rewards", rewardController.getRewards);
router.post("/apply-reward", rewardController.applyReward);

module.exports = router;
