const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dishController');

// Route to get all dishes
router.get('/', dishController.getAllDishes);

// Route to get a dish by ID
router.get('/:id', dishController.getDishById);

// Route to create a new dish
router.post('/', dishController.createDish);

// Route to update a dish by ID
router.put('/:id', dishController.updateDish);

// Route to delete a dish by ID
router.delete('/:id', dishController.deleteDish);

module.exports = router;