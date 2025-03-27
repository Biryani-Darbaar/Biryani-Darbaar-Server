// src/utils/validation.js
const { body, validationResult } = require('express-validator');

const validateUser = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const validateCategory = [
  body('name').notEmpty().withMessage('Category name is required'),
];

const validateDish = [
  body('name').notEmpty().withMessage('Dish name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
];

const validateLocation = [
  body('name').notEmpty().withMessage('Location name is required'),
  body('address').notEmpty().withMessage('Address is required'),
];

const validatePromo = [
  body('code').notEmpty().withMessage('Promo code is required'),
  body('discount').isNumeric().withMessage('Discount must be a number'),
];

const validateReward = [
  body('reward').notEmpty().withMessage('Reward is required'),
  body('dollar').isNumeric().withMessage('Dollar value must be a number'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateUser,
  validateCategory,
  validateDish,
  validateLocation,
  validatePromo,
  validateReward,
  validate,
};