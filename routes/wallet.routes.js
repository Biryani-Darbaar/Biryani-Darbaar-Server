/**
 * Wallet Routes
 *
 *  GET  /wallet          — get current balance + spin eligibility
 *  POST /wallet/spin     — spin the daily wheel (server-enforced once-per-day)
 *  POST /wallet/redeem   — redeem coins for an AUD discount (min 50 coins)
 *
 * All endpoints require a valid JWT (authenticateJWT).
 */

const express = require("express");
const router  = express.Router();

const { authenticateJWT }            = require("../middlewares/auth.middleware");
const { getWallet, spinWheel, redeemCoins } = require("../controllers/wallet.controller");
const { asyncHandler }               = require("../utils/response.util");

// Every wallet route requires authentication
router.use(authenticateJWT);

router.get("/wallet",        asyncHandler(getWallet));
router.post("/wallet/spin",  asyncHandler(spinWheel));
router.post("/wallet/redeem", asyncHandler(redeemCoins));

module.exports = router;
