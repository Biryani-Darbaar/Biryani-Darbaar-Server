// filepath: biriyani-darbar-server/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// User registration route
router.post('/register', userController.registerUser);

// User login route
router.post('/login', userController.loginUser);

// Get user profile route
router.get('/:id', authMiddleware.verifyToken, userController.getUserProfile);

// Update user profile route
router.put('/:id', authMiddleware.verifyToken, userController.updateUserProfile);

// Delete user account route
router.delete('/:id', authMiddleware.verifyToken, userController.deleteUserAccount);

module.exports = router;