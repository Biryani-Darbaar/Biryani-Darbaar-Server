const { ValidationError } = require("./errors.util");

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
  return true;
};

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new ValidationError(
      "Password must be at least 8 characters with uppercase, lowercase, and number"
    );
  }
  return true;
};

/**
 * Validate phone number
 */
const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new ValidationError("Invalid phone number format");
  }
  return true;
};

/**
 * Validate required fields
 */
const validateRequired = (fields, data) => {
  const errors = [];

  fields.forEach((field) => {
    if (
      !data[field] ||
      (typeof data[field] === "string" && !data[field].trim())
    ) {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  });

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  return true;
};

/**
 * Validate string length
 */
const validateLength = (value, min, max, fieldName = "Field") => {
  if (value.length < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min} characters`
    );
  }
  if (max && value.length > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max} characters`);
  }
  return true;
};

/**
 * Validate number range
 */
const validateRange = (value, min, max, fieldName = "Value") => {
  const num = Number(value);
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  if (num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max}`);
  }
  return true;
};

/**
 * Validate array
 */
const validateArray = (value, minLength = 1, fieldName = "Array") => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${minLength} item(s)`
    );
  }
  return true;
};

/**
 * Validate MongoDB ObjectId format (also works for Firestore doc IDs)
 */
const validateId = (id, fieldName = "ID") => {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
  return true;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str.trim().replace(/<script[^>]*>.*?<\/script>/gi, "");
};

/**
 * Validate and sanitize object
 */
const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateRequired,
  validateLength,
  validateRange,
  validateArray,
  validateId,
  sanitizeString,
  sanitizeObject,
};
