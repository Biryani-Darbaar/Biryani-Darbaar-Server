// Run: npm test
const test = require("node:test");
const assert = require("node:assert");
const { checkOpen, applyChange } = require("../lib/ordering.lib");

const ALL_ON = { open: true, pickup: true, delivery: true, autoClosed: false };
const pick = ({ open, pickup, delivery, autoClosed }) => ({ open, pickup, delivery, autoClosed });

test("ordering switch: OFF blocks checkout with 503 ORDERS_PAUSED, ON/missing allows", () => {
  assert.throws(() => checkOpen({ open: false }), (e) => e.statusCode === 503 && e.errorCode === "ORDERS_PAUSED");
  assert.doesNotThrow(() => checkOpen({ open: true }));
  assert.doesNotThrow(() => checkOpen({}, "delivery"));
});

test("pickup/delivery switch: blocks only the switched-off method with SHIPPING_METHOD_PAUSED", () => {
  const s = { ...ALL_ON, pickup: false };
  assert.throws(() => checkOpen(s, "pickup"), (e) => e.statusCode === 503 && e.errorCode === "SHIPPING_METHOD_PAUSED");
  assert.doesNotThrow(() => checkOpen(s, "delivery"));
});

test("switch rules: both methods off closes ordering; re-enabling reopens only if auto-closed", () => {
  const oneOff = applyChange(ALL_ON, { pickup: false });
  assert.deepStrictEqual(pick(oneOff), { open: true, pickup: false, delivery: true, autoClosed: false });

  const bothOff = applyChange(oneOff, { delivery: false });
  assert.deepStrictEqual(pick(bothOff), { open: false, pickup: false, delivery: false, autoClosed: true });

  // auto-closed → turning a method back on reopens ordering
  assert.deepStrictEqual(pick(applyChange(bothOff, { pickup: true })), { open: true, pickup: true, delivery: false, autoClosed: false });

  // closed on purpose → stays closed when a method comes back
  const manual = applyChange(ALL_ON, { open: false });
  const manualBothOff = applyChange(applyChange(manual, { pickup: false }), { delivery: false });
  assert.strictEqual(manualBothOff.autoClosed, false);
  assert.strictEqual(applyChange(manualBothOff, { delivery: true }).open, false);

  // ordering ON while both methods are off restores both
  assert.deepStrictEqual(pick(applyChange(bothOff, { open: true })), ALL_ON);
  // ordering ON keeps a single switched-off method as it is
  assert.deepStrictEqual(pick(applyChange({ ...oneOff, open: false }, { open: true })), pick(oneOff));
});
