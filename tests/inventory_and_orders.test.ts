import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createStaffOrderSchema,
  createOrderSchema,
} from "@/lib/validations/order.schema";
import {
  inventoryItemSchema,
  inventoryMovementSchema,
  recipeIngredientSchema,
} from "@/lib/validations/inventory.schema";
import {
  restaurantChargeSchema,
  taxConfigSchema,
} from "@/lib/validations/charges.schema";
import { menuItemSchema, updateMenuItemSchema } from "@/lib/validations/menu.schema";
import { updateRestaurantSchema } from "@/lib/validations/restaurant.schema";

describe("Taxes & Charges Calculation Logic", () => {
  function calculateCharges(
    subtotalPaise: number,
    charges: Array<{
      id: string;
      name: string;
      charge_type: "PERCENTAGE" | "FIXED";
      rate_or_amount: number;
      applies_to: "ALL" | "DINE_IN" | "PARCEL";
      is_active: boolean;
    }>,
    orderType: "DINE_IN" | "PARCEL"
  ) {
    let additionalChargesPaise = 0;
    const breakdown: Array<{ name: string; amountPaise: number }> = [];

    for (const ch of charges) {
      if (!ch.is_active) continue;
      if (ch.applies_to !== "ALL" && ch.applies_to !== orderType) continue;

      let amt = 0;
      if (ch.charge_type === "PERCENTAGE") {
        amt = Math.round((subtotalPaise * ch.rate_or_amount) / 100);
      } else {
        amt = Math.round(ch.rate_or_amount);
      }

      if (amt > 0) {
        additionalChargesPaise += amt;
        breakdown.push({ name: ch.name, amountPaise: amt });
      }
    }

    return {
      subtotalPaise,
      additionalChargesPaise,
      totalPaise: subtotalPaise + additionalChargesPaise,
      breakdown,
    };
  }

  it("calculates percentage tax correctly on integer paise without rounding error", () => {
    const result = calculateCharges(
      45000, // ₹450.00
      [
        {
          id: "c1",
          name: "GST",
          charge_type: "PERCENTAGE",
          rate_or_amount: 5, // 5%
          applies_to: "ALL",
          is_active: true,
        },
      ],
      "DINE_IN"
    );

    assert.equal(result.subtotalPaise, 45000);
    assert.equal(result.additionalChargesPaise, 2250); // ₹22.50
    assert.equal(result.totalPaise, 47250); // ₹472.50
    assert.equal(result.breakdown[0].amountPaise, 2250);
  });

  it("applies fixed charges according to order type (DINE_IN vs PARCEL)", () => {
    const charges = [
      {
        id: "c1",
        name: "Service Charge",
        charge_type: "FIXED" as const,
        rate_or_amount: 2500, // ₹25.00
        applies_to: "DINE_IN" as const,
        is_active: true,
      },
      {
        id: "c2",
        name: "Packaging Fee",
        charge_type: "FIXED" as const,
        rate_or_amount: 1500, // ₹15.00
        applies_to: "PARCEL" as const,
        is_active: true,
      },
      {
        id: "c3",
        name: "GST",
        charge_type: "PERCENTAGE" as const,
        rate_or_amount: 5, // 5%
        applies_to: "ALL" as const,
        is_active: true,
      },
    ];

    // Dine-in order of ₹500
    const dineInResult = calculateCharges(50000, charges, "DINE_IN");
    // GST = ₹25.00 (2500 paise), Service Charge = ₹25.00 (2500 paise)
    assert.equal(dineInResult.additionalChargesPaise, 5000);
    assert.equal(dineInResult.totalPaise, 55000);
    assert.equal(dineInResult.breakdown.length, 2);
    assert.ok(dineInResult.breakdown.some((b) => b.name === "Service Charge"));
    assert.ok(!dineInResult.breakdown.some((b) => b.name === "Packaging Fee"));

    // Parcel order of ₹500
    const parcelResult = calculateCharges(50000, charges, "PARCEL");
    // GST = ₹25.00 (2500 paise), Packaging Fee = ₹15.00 (1500 paise)
    assert.equal(parcelResult.additionalChargesPaise, 4000);
    assert.equal(parcelResult.totalPaise, 54000);
    assert.ok(parcelResult.breakdown.some((b) => b.name === "Packaging Fee"));
    assert.ok(!parcelResult.breakdown.some((b) => b.name === "Service Charge"));
  });

  it("does not show or charge Taxes (GST) when owner has not configured GST", () => {
    const subtotalPaise = 35000; // ₹350.00
    const ownerTaxConfig = { isGstEnabled: false, gstPercentage: 0 };

    const gstRate = ownerTaxConfig.isGstEnabled ? ownerTaxConfig.gstPercentage : 0;
    const taxPaise = gstRate > 0 ? Math.round((subtotalPaise * gstRate) / 100) : 0;
    const shouldShowTax = taxPaise > 0 && ownerTaxConfig.isGstEnabled;

    assert.equal(taxPaise, 0);
    assert.equal(shouldShowTax, false);
  });

  it("calculates and shows Taxes (GST) when configured by restaurant owner", () => {
    const subtotalPaise = 35000; // ₹350.00
    const ownerTaxConfig = { isGstEnabled: true, gstPercentage: 5 }; // 5% GST

    const gstRate = ownerTaxConfig.isGstEnabled ? ownerTaxConfig.gstPercentage : 0;
    const taxPaise = gstRate > 0 ? Math.round((subtotalPaise * gstRate) / 100) : 0;
    const shouldShowTax = taxPaise > 0 && ownerTaxConfig.isGstEnabled;

    assert.equal(taxPaise, 1750); // ₹17.50
    assert.equal(shouldShowTax, true);
    assert.equal(subtotalPaise + taxPaise, 36750); // ₹367.50
  });

  it("validates tax configuration schema correctly", () => {
    // Valid 5% GST
    const validConfig = taxConfigSchema.parse({
      isGstEnabled: true,
      gstPercentage: 5,
      gstNumber: "27AAAAA0000A1Z5",
    });
    assert.equal(validConfig.isGstEnabled, true);
    assert.equal(validConfig.gstPercentage, 5);
    assert.equal(validConfig.gstNumber, "27AAAAA0000A1Z5");

    // Disabled GST
    const disabledConfig = taxConfigSchema.parse({
      isGstEnabled: false,
      gstPercentage: 0,
    });
    assert.equal(disabledConfig.isGstEnabled, false);
    assert.equal(disabledConfig.gstPercentage, 0);

    // Negative percentage rejected
    assert.throws(() => {
      taxConfigSchema.parse({
        isGstEnabled: true,
        gstPercentage: -5,
      });
    });

    // Exceeding 100% rejected
    assert.throws(() => {
      taxConfigSchema.parse({
        isGstEnabled: true,
        gstPercentage: 105,
      });
    });
  });
});

describe("Inventory Stock Calculation & Alerts", () => {
  function computeStockStatus(stock: number, threshold: number) {
    return {
      isOutOfStock: stock <= 0,
      isLowStock: stock > 0 && stock <= threshold,
      currentStock: stock,
      threshold,
    };
  }

  it("correctly identifies normal, low, and out of stock levels", () => {
    // Normal stock
    const normal = computeStockStatus(25, 5);
    assert.equal(normal.isOutOfStock, false);
    assert.equal(normal.isLowStock, false);

    // Exactly at threshold
    const atThreshold = computeStockStatus(5, 5);
    assert.equal(atThreshold.isOutOfStock, false);
    assert.equal(atThreshold.isLowStock, true);

    // Below threshold
    const belowThreshold = computeStockStatus(2, 5);
    assert.equal(belowThreshold.isOutOfStock, false);
    assert.equal(belowThreshold.isLowStock, true);

    // Zero stock
    const zero = computeStockStatus(0, 5);
    assert.equal(zero.isOutOfStock, true);
    assert.equal(zero.isLowStock, false);

    // Negative stock (oversold / deficit)
    const negative = computeStockStatus(-1, 5);
    assert.equal(negative.isOutOfStock, true);
    assert.equal(negative.isLowStock, false);
  });

  it("applies stock movement deltas accurately", () => {
    let currentStock = 10;

    // 1. Purchase (+15)
    currentStock += 15;
    assert.equal(currentStock, 25);

    // 2. Kitchen order deduction (-5)
    currentStock -= 5;
    assert.equal(currentStock, 20);

    // 3. Wastage (-3)
    currentStock -= 3;
    assert.equal(currentStock, 17);

    // 4. Damaged (-2)
    currentStock -= 2;
    assert.equal(currentStock, 15);
  });
});

describe("Staff Order & Schema Validations", () => {
  it("validates Table Dine-In staff order requires valid tableId", () => {
    const validTableOrder = {
      orderType: "DINE_IN",
      tableId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      items: [
        {
          menuItemId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
          quantity: 2,
        },
      ],
      specialInstructions: "Extra crispy",
    };

    const parsed = createStaffOrderSchema.safeParse(validTableOrder);
    assert.equal(parsed.success, true);
  });

  it("validates Parcel (Takeaway) staff order does not require tableId", () => {
    const validParcelOrder = {
      orderType: "PARCEL",
      customerName: "Sanjay Singhania",
      customerPhone: "9876543210",
      items: [
        {
          menuItemId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
          quantity: 1,
          variantId: "c1d2e3f4-a5b6-7c8d-9e0f-3a4b5c6d7e8f",
        },
      ],
    };

    const parsed = createStaffOrderSchema.safeParse(validParcelOrder);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.orderType, "PARCEL");
      assert.equal(parsed.data.customerName, "Sanjay Singhania");
      assert.equal(parsed.data.items[0].variantId, "c1d2e3f4-a5b6-7c8d-9e0f-3a4b5c6d7e8f");
    }
  });

  it("rejects orders with quantity less than 1", () => {
    const invalidOrder = {
      orderType: "PARCEL",
      items: [
        {
          menuItemId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
          quantity: 0,
        },
      ],
    };

    const parsed = createStaffOrderSchema.safeParse(invalidOrder);
    assert.equal(parsed.success, false);
  });
});

describe("Inventory & Charges Schema Validations", () => {
  it("validates inventory item input schema", () => {
    const validItem = {
      name: "Paneer Block",
      sku: "RAW-PAN-01",
      currentStock: 10.5,
      unit: "kg",
      lowStockThreshold: 3,
      purchasePricePaise: 35000, // ₹350/kg
      supplierName: "Amul Dairy",
    };

    const parsed = inventoryItemSchema.safeParse(validItem);
    assert.equal(parsed.success, true);
  });

  it("validates stock movement schema", () => {
    const validMovement = {
      movementType: "PURCHASE",
      quantity: 5,
      reason: "Weekly grocery restock",
    };

    const parsed = inventoryMovementSchema.safeParse(validMovement);
    assert.equal(parsed.success, true);
  });

  it("validates recipe ingredient mapping schema", () => {
    const validRecipe = {
      menuItemId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
      inventoryItemId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      quantityRequired: 0.25, // 250g per dish
    };

    const parsed = recipeIngredientSchema.safeParse(validRecipe);
    assert.equal(parsed.success, true);
  });

  it("validates restaurant charge schema", () => {
    const validCharge = {
      name: "Restaurant Service Charge",
      chargeType: "PERCENTAGE",
      rateOrAmount: 10, // 10%
      appliesTo: "DINE_IN",
      isActive: true,
    };

    const parsed = restaurantChargeSchema.safeParse(validCharge);
    assert.equal(parsed.success, true);
  });

  describe("Menu Item Veg & Non-Veg Dietary Mapping", () => {
    it("maps dietary_type NON_VEG to isVeg false", () => {
      const raw = {
        categoryId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
        name: "Butter Chicken",
        price_paise: 35000,
        dietary_type: "NON_VEG",
      };
      const parsed = menuItemSchema.parse(raw);
      assert.equal(parsed.isVeg, false);
    });

    it("maps dietary_type EGG to isVeg false", () => {
      const raw = {
        categoryId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
        name: "Egg Curry",
        price_paise: 18000,
        dietary_type: "EGG",
      };
      const parsed = menuItemSchema.parse(raw);
      assert.equal(parsed.isVeg, false);
    });

    it("maps dietary_type VEG to isVeg true", () => {
      const raw = {
        categoryId: "b1c2d3e4-f5a6-7b8c-9d0e-2f3a4b5c6d7e",
        name: "Paneer Tikka",
        price_paise: 24000,
        dietary_type: "VEG",
      };
      const parsed = menuItemSchema.parse(raw);
      assert.equal(parsed.isVeg, true);
    });

    it("updates existing item with is_veg boolean", () => {
      const updateNonVeg = updateMenuItemSchema.parse({
        is_veg: false,
      });
      assert.equal(updateNonVeg.isVeg, false);

      const updateVeg = updateMenuItemSchema.parse({
        dietary_type: "VEG",
      });
      assert.equal(updateVeg.isVeg, true);
    });
  });

  describe("Restaurant Status & Deactivation Logic", () => {
    it("correctly parses deactivation with snake_case is_active false", () => {
      const parsed = updateRestaurantSchema.parse({
        is_active: false,
      });
      assert.equal(parsed.isActive, false);
      assert.equal(parsed.is_active, false);
    });

    it("correctly parses activation with snake_case is_active true", () => {
      const parsed = updateRestaurantSchema.parse({
        is_active: true,
      });
      assert.equal(parsed.isActive, true);
      assert.equal(parsed.is_active, true);
    });

    it("correctly parses activation with camelCase isActive true", () => {
      const parsed = updateRestaurantSchema.parse({
        isActive: true,
      });
      assert.equal(parsed.isActive, true);
      assert.equal(parsed.is_active, true);
    });
  });
});

