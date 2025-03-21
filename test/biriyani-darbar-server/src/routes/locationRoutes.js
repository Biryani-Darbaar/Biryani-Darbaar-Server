const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Route to create a new location
router.post('/', locationController.createLocation);

// Route to get all locations
router.get('/', locationController.getAllLocations);

// Route to update a location by ID
router.put('/:id', locationController.updateLocation);

// Route to delete a location by ID
router.delete('/:id', locationController.deleteLocation);

module.exports = router;