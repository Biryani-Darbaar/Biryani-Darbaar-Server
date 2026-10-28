// Run: npm test   (node --test test/pos.payload.test.js)
const test = require("node:test");
const assert = require("node:assert");
const { buildPosPayload, normalisePhone } = require("../lib/pos.lib");

test("POS payload: GST split, merge by POS id, instructions on first item", () => {
  const order = {
    phoneNumber: "+61 412 345 678",
    instructions: "Extra spicy",
    orderItems: [
      { posItemId: "1",  posItemName: "SAMOSA (2 PCS)", price: 6,   quantity: 2 },
      { posItemId: "26", posItemName: "BUTTER NAAN",    price: 3.5, quantity: 1 },
      { posItemId: "1",  posItemName: "SAMOSA (2 PCS)", price: 6,   quantity: 1 },
    ],
  };
  const p = buildPosPayload(order, { firstName: "Sam", lastName: "B", email: "s@x.com" });

  assert.deepStrictEqual(p.cartItems["1"], {
    item_id: "1", item_name: "SAMOSA (2 PCS)", price: "5.4", quantity: "3", item_image: "",
    item_total: "16.2", item_taxable: "0", item_taxraw: "5||GST-10%||10||0", item_uom: "1",
    instruction: "Extra spicy",
  });
  assert.strictEqual(p.cartItems["26"].price, "3.15");
  assert.strictEqual(p.cartItems["26"].instruction, "");
  assert.strictEqual(p.subtotal_value, 19.35);          // 16.2 + 3.15 (ex-GST)
  assert.strictEqual(p.total_tax_value, "2.15");         // 1.8 + 0.35
  assert.strictEqual(p.subtotal_value + Number(p.total_tax_value), 6 * 3 + 3.5); // = list total
  assert.deepStrictEqual(JSON.parse(p.taxArray)["1"], { item_id: "1", total_tax: "1.8" });
  assert.strictEqual(p.customer_phone, "0412345678");
  assert.strictEqual(p.order_type, "1");
  assert.strictEqual(p.till_no, "1");
  assert.strictEqual(p.delivery_charge, 0);
});

test("phone normalisation", () => {
  assert.strictEqual(normalisePhone("0412 345 678"), "0412345678");
  assert.strictEqual(normalisePhone("61412345678"), "0412345678");
});
