const express = require("express");
const router = express.Router();
const { checkCollectionLimit, authenticateJWT, requireAdmin } = require("../middlewares");
const miniGameController = require("../controllers/miniGame.controller");

// Mini game routes
router.post(
  "/miniGames",
  authenticateJWT,
  requireAdmin,
  checkCollectionLimit,
  miniGameController.createMiniGame
);
router.get("/miniGames", miniGameController.getMiniGames);
router.put(
  "/miniGames/:id",
  authenticateJWT,
  requireAdmin,
  miniGameController.updateMiniGame
);
router.delete(
  "/miniGames/:id",
  authenticateJWT,
  requireAdmin,
  miniGameController.deleteMiniGame
);

module.exports = router;
