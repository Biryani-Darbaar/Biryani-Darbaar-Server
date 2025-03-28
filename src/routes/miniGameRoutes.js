const express = require("express");
const router = express.Router();
const miniGameController = require("../controllers/miniGameController");

router.post("/", miniGameController.createGame);
router.get("/", miniGameController.getAllGames);
router.put("/:id", miniGameController.updateGame);
router.delete("/:id", miniGameController.deleteGame);

module.exports = router;
