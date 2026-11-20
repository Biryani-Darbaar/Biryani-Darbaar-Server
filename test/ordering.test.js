// Run: npm test
const test = require("node:test");
const assert = require("node:assert");
const { checkOpen } = require("../lib/ordering.lib");

test("ordering switch: OFF blocks checkout with 503 ORDERS_PAUSED, ON/missing allows", () => {
  assert.throws(() => checkOpen({ open: false }), (e) => e.statusCode === 503 && e.errorCode === "ORDERS_PAUSED");
  assert.doesNotThrow(() => checkOpen({ open: true }));
});
