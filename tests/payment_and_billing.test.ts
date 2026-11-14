import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { updatePaymentConfigSchema } from "@/lib/validations/payment-config.schema";
import { createOrderSchema } from "@/lib/validations/order.schema";

describe("Payment Configuration Validations", () => {
  it("validates default payment configuration with pay at counter", () => {
    const parsed = updatePaymentConfigSchema.parse({
      acceptCounter: true,
      acceptRazorpay: false,
      acceptUpi: false,
      payPolicy: "PAY_LATER",
    });

    assert.equal(parsed.acceptCounter, true);
    assert.equal(parsed.acceptRazorpay, false);
    assert.equal(parsed.acceptUpi, false);
    assert.equal(parsed.payPolicy, "PAY_LATER");
  });

  it("normalizes snake_case database inputs to camelCase", () => {
    const parsed = updatePaymentConfigSchema.parse({
      accept_counter: true,
      accept_razorpay: true,
      accept_upi: true,
      pay_policy: "PAY_FIRST",
      razorpay_key_id: "rzp_live_test123",
      razorpay_key_secret: "secret_xyz",
      upi_id: "test@okicici",
      upi_name: "Carry Putta",
    });

    assert.equal(parsed.acceptCounter, true);
    assert.equal(parsed.acceptRazorpay, true);
    assert.equal(parsed.acceptUpi, true);
    assert.equal(parsed.payPolicy, "PAY_FIRST");
    assert.equal(parsed.razorpayKeyId, "rzp_live_test123");
    assert.equal(parsed.upiId, "test@okicici");
    assert.equal(parsed.upiName, "Carry Putta");
  });

  it("fails if all payment methods are switched off", () => {
    assert.throws(
      () =>
        updatePaymentConfigSchema.parse({
          acceptCounter: false,
          acceptRazorpay: false,
          acceptUpi: false,
        }),
      /At least one payment option/
    );
  });

  it("requires Razorpay Key ID when Razorpay is enabled", () => {
    assert.throws(
      () =>
        updatePaymentConfigSchema.parse({
          acceptCounter: false,
          acceptRazorpay: true,
          acceptUpi: false,
          razorpayKeyId: "",
        }),
      /Razorpay Key ID is required/
    );
  });

  it("requires UPI ID when Pay by UPI is enabled", () => {
    assert.throws(
      () =>
        updatePaymentConfigSchema.parse({
          acceptCounter: false,
          acceptRazorpay: false,
          acceptUpi: true,
          upiId: "",
        }),
      /UPI ID is required/
    );
  });
});

describe("Order Payment Mode & Prepayment Schema", () => {
  it("accepts paymentMode, customerName and customerPhone in createOrderSchema", () => {
    const input = {
      table_token: "token-12345678",
      idempotency_key: "c0000000-0000-4000-8000-000000000001",
      items: [
        {
          menuItemId: "c0000000-0000-4000-8000-000000000002",
          quantity: 2,
        },
      ],
      customer_name: "Aarav Singh",
      customer_phone: "9876543210",
      payment_mode: "UPI",
    };

    const parsed = createOrderSchema.parse(input);
    assert.equal(parsed.paymentMode, "UPI");
    assert.equal(parsed.customerName, "Aarav Singh");
    assert.equal(parsed.customerPhone, "9876543210");
  });
});

describe("POS Thermal Bill & Indian GST Breakdown Calculation", () => {
  it("splits total GST tax equally into CGST and SGST for restaurant bill", () => {
    const subtotalPaise = 364700; // ₹3,647.00
    const gstPercentage = 18; // 18% GST (9% CGST + 9% SGST)
    const taxPaise = Math.round((subtotalPaise * gstPercentage) / 100); // 65646 paise (₹656.46)

    const cgstPaise = Math.round(taxPaise / 2); // 32823 paise (₹328.23)
    const sgstPaise = taxPaise - cgstPaise; // 32823 paise (₹328.23)

    assert.equal(cgstPaise, 32823);
    assert.equal(sgstPaise, 32823);
    assert.equal(cgstPaise + sgstPaise, taxPaise);

    const totalPaise = subtotalPaise + taxPaise;
    assert.equal(totalPaise, 430346); // ₹4,303.46 (exact match with user's screenshot!)
  });
});
