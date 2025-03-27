const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Route to add an item to the cart
router.post('/', cartController.addItemToCart);

// Route to get all items in the cart
router.get('/', cartController.getCartItems);

// Route to update an item in the cart
router.put('/:id', cartController.updateCartItem);

// Route to delete an item from the cart
router.delete('/:id', cartController.deleteCartItem);

module.exports = router;