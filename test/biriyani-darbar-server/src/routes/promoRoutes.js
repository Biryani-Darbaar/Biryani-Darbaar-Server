// filepath: /biriyani-darbar-server/biriyani-darbar-server/src/routes/promoRoutes.js
const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');

// Route to create a new promo code
router.post('/', promoController.createPromo);

// Route to validate a promo code
router.post('/validate', promoController.validatePromo);

// Route to get all promo codes
router.get('/', promoController.getAllPromos);

module.exports = router;