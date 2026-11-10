// Run: npm test
const test = require("node:test");
const assert = require("node:assert");
const { coinsEarnedFor, maxRedeemableCoinsFor } = require("../lib/checkout.lib");

test("coins earned: 5% of amount paid, floored to whole dollars, 10 coins per $1", () => {
  assert.strictEqual(coinsEarnedFor(60), 30);
  assert.strictEqual(coinsEarnedFor(65), 30);    // $3.25 -> $3
  assert.strictEqual(coinsEarnedFor(59.99), 20); // $2.9995 -> $2
  assert.strictEqual(coinsEarnedFor(19.99), 0);
  assert.strictEqual(coinsEarnedFor(140), 70);   // float-safe (7.000000000000001)
});

test("coins redeemable: max 50% of order, total stays >= $10, capped by balance", () => {
  assert.strictEqual(maxRedeemableCoinsFor(60, 1000), 300); // 50% of $60 = $30
  assert.strictEqual(maxRedeemableCoinsFor(60, 120), 120);  // limited by wallet
  assert.strictEqual(maxRedeemableCoinsFor(16, 1000), 60);  // $16 - $10 floor = $6 (< 50%)
  assert.strictEqual(maxRedeemableCoinsFor(10, 1000), 0);   // already at the floor
  assert.strictEqual(maxRedeemableCoinsFor(8, 1000), 0);    // never negative
});
