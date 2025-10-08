const express = require("express");
const router = express.Router();
const { checkCollectionLimit } = require("../middlewares");
const miniGameController = require("../controllers/miniGame.controller");

// Mini game routes
router.post(
  "/miniGames",
  checkCollectionLimit,
  miniGameController.createMiniGame
);
router.get("/miniGames", miniGameController.getMiniGames);
router.put("/miniGames/:id", miniGameController.updateMiniGame);
router.delete("/miniGames/:id", miniGameController.deleteMiniGame);

module.exports = router;
