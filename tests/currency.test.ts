import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatPaiseToINR, rupeesToPaise, paiseToRupees } from "@/lib/utils/currency";

describe("Currency & Integer Paise Precision", () => {
  it("formats integer paise to INR currency string", () => {
    assert.equal(formatPaiseToINR(15050), "₹150.50");
    assert.equal(formatPaiseToINR(0), "₹0.00");
    assert.equal(formatPaiseToINR(10000000), "₹1,00,000.00");
    assert.equal(formatPaiseToINR(1999), "₹19.99");
  });

  it("converts rupees to paise without floating point rounding errors", () => {
    assert.equal(rupeesToPaise(19.99), 1999);
    assert.equal(rupeesToPaise("100.50"), 10050);
    assert.equal(rupeesToPaise(250.75), 25075);
    assert.equal(rupeesToPaise(0.1 + 0.2), 30); // Famous IEEE 754 float trap handled safely
  });

  it("converts paise to rupees for input fields", () => {
    assert.equal(paiseToRupees(15050), 150.5);
    assert.equal(paiseToRupees(1999), 19.99);
  });
});
