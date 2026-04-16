const { db } = require("../config/firebase.config");
const { COLLECTION_NAMES } = require("../constants");
const { successResponse, errorResponse } = require("../utils/response.util");

// ── Spin-wheel segment definitions ────────────────────────────────────────────
// weights must sum to 100 for clarity; prize is in coins
const SPIN_SEGMENTS = [
  { coins: 0,  weight: 40 },  // 40 % chance
  { coins: 5,  weight: 35 },  // 35 % chance
  { coins: 10, weight: 20 },  // 20 % chance
  { coins: 20, weight: 5  },  //  5 % chance
];
const TOTAL_WEIGHT = SPIN_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

/** Randomly select a reward based on weighted probabilities */
function pickReward() {
  let rand = Math.floor(Math.random() * TOTAL_WEIGHT);
  for (const seg of SPIN_SEGMENTS) {
    if (rand < seg.weight) return seg.coins;
    rand -= seg.weight;
  }
  return 0; // fallback (shouldn't happen)
}

/** Returns the current date as YYYY-MM-DD in UTC for day-boundary comparison */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /wallet
 * Returns wallet balance, last spin timestamp, and whether the user can spin today.
 */
const getWallet = async (req, res) => {
  const userId = req.user.userId;

  const userDoc = await db.collection(COLLECTION_NAMES.USERS).doc(userId).get();
  if (!userDoc.exists) return errorResponse(res, 404, "User not found");

  const data = userDoc.data();
  const lastSpinAt  = data.lastSpinAt ?? null;
  const canSpinToday = !lastSpinAt || lastSpinAt.slice(0, 10) !== todayUTC();

  return successResponse(res, 200, {
    walletBalance: data.walletBalance ?? 0,
    lastSpinAt,
    canSpinToday,
  });
};

/**
 * POST /wallet/spin
 * Server-enforced daily spin — rejects if the user already spun today (UTC).
 * Increments walletBalance and records lastSpinAt.
 */
const spinWheel = async (req, res) => {
  const userId = req.user.userId;

  const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return errorResponse(res, 404, "User not found");

  const userData  = userDoc.data();
  const lastSpinAt = userData.lastSpinAt ?? null;

  // Enforce one spin per calendar day (UTC)
  if (lastSpinAt && lastSpinAt.slice(0, 10) === todayUTC()) {
    return errorResponse(res, 429, "You have already spun today. Come back tomorrow!");
  }

  const coinsWon   = pickReward();
  const newBalance = (userData.walletBalance ?? 0) + coinsWon;
  const now        = new Date().toISOString();

  await userRef.update({
    walletBalance: newBalance,
    lastSpinAt:   now,
  });

  return successResponse(
    res,
    200,
    { coinsWon, walletBalance: newBalance, lastSpinAt: now },
    coinsWon > 0 ? `You won ${coinsWon} coins!` : "Better luck next time!"
  );
};

/**
 * POST /wallet/redeem
 * Body: { coinsToRedeem: number }   — must be >= 50 and <= walletBalance
 * Returns the AUD discount amount (1 coin = $0.10).
 */
const redeemCoins = async (req, res) => {
  const userId       = req.user.userId;
  const { coinsToRedeem } = req.body;

  // Validate input
  if (
    !coinsToRedeem ||
    typeof coinsToRedeem !== "number" ||
    !Number.isInteger(coinsToRedeem) ||
    coinsToRedeem < 50
  ) {
    return errorResponse(res, 400, "Minimum 50 coins required to redeem. Coins must be a whole number.");
  }

  const userRef = db.collection(COLLECTION_NAMES.USERS).doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return errorResponse(res, 404, "User not found");

  const currentBalance = userDoc.data().walletBalance ?? 0;

  if (coinsToRedeem > currentBalance) {
    return errorResponse(
      res, 400,
      `Insufficient coins. Your balance: ${currentBalance} coins.`
    );
  }

  const newBalance     = currentBalance - coinsToRedeem;
  const discountAmount = parseFloat((coinsToRedeem * 0.1).toFixed(2)); // $0.10 per coin

  await userRef.update({ walletBalance: newBalance });

  return successResponse(res, 200, {
    coinsRedeemed: coinsToRedeem,
    discountAmount,
    walletBalance: newBalance,
  });
};

// ── Admin: wallet management ──────────────────────────────────────────────────

/**
 * PATCH /admin/users/:id/wallet
 * Body: { action: "increase"|"decrease"|"reset", amount?: number }
 */
const updateUserWallet = async (req, res) => {
  const { id }             = req.params;
  const { action, amount } = req.body;

  const VALID_ACTIONS = ["increase", "decrease", "reset"];
  if (!VALID_ACTIONS.includes(action)) {
    return errorResponse(res, 400, `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`);
  }

  const userRef = db.collection(COLLECTION_NAMES.USERS).doc(id);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return errorResponse(res, 404, "User not found");

  const currentBalance = userDoc.data().walletBalance ?? 0;
  let newBalance;

  if (action === "reset") {
    newBalance = 0;
  } else {
    const coins = Math.floor(Number(amount) || 0);
    if (coins <= 0) {
      return errorResponse(res, 400, "Amount must be a positive integer");
    }
    newBalance = action === "increase"
      ? currentBalance + coins
      : Math.max(0, currentBalance - coins);
  }

  await userRef.update({ walletBalance: newBalance });

  return successResponse(res, 200, { id, walletBalance: newBalance }, "Wallet updated successfully");
};

module.exports = { getWallet, spinWheel, redeemCoins, updateUserWallet };
