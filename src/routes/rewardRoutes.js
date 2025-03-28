const express = require("express");
const router = express.Router();
const rewardController = require("../controllers/rewardController");

router.post("/", rewardController.createReward);
router.get("/user/:userId", rewardController.getUserRewards);
router.put("/:id/redeem", rewardController.redeemReward);

module.exports = router;
