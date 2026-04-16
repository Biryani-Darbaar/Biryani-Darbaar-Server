const express = require("express");
const router = express.Router();
const { submitContactForm } = require("../controllers/contact.controller");
const { asyncHandler } = require("../utils/response.util");

/**
 * Public contact / catering form submission
 */
router.post("/contact", asyncHandler(submitContactForm));

module.exports = router;
