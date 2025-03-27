const express = require('express');
const router = express.Router();
const miniGameController = require('../controllers/miniGameController');

// Route to create a new mini game
router.post('/', miniGameController.createMiniGame);

// Route to get all mini games
router.get('/', miniGameController.getAllMiniGames);

// Route to update a mini game by ID
router.put('/:id', miniGameController.updateMiniGame);

// Route to delete a mini game by ID
router.delete('/:id', miniGameController.deleteMiniGame);

module.exports = router;