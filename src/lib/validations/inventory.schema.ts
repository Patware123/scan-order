import { z } from "zod";

const baseInventoryItemObject = z.object({
  name: z.string().min(1, "Name is required").max(100),
  sku: z.string().max(50).optional().nullable(),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative").default(0),
  unit: z.string().min(1).max(20).default("pcs"),
  lowStockThreshold: z.coerce.number().min(0).default(5),
  purchasePricePaise: z.coerce.number().int().min(0).default(0),
  supplierName: z.string().max(100).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

function preprocessInventory(val: any) {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      currentStock: val.currentStock ?? val.current_stock ?? 0,
      lowStockThreshold: val.lowStockThreshold ?? val.low_stock_threshold ?? 5,
      purchasePricePaise: val.purchasePricePaise ?? val.purchase_price_paise ?? 0,
      supplierName: val.supplierName ?? val.supplier_name ?? null,
      expiryDate: val.expiryDate ?? val.expiry_date ?? null,
    };
  }
  return val;
}

export const inventoryItemSchema = z.preprocess(preprocessInventory, baseInventoryItemObject);
export const updateInventoryItemSchema = z.preprocess(preprocessInventory, baseInventoryItemObject.partial());

export const inventoryMovementSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      movementType: val.movementType ?? val.movement_type,
    };
  }
  return val;
}, z.object({
  movementType: z.enum(["PURCHASE", "USAGE", "WASTAGE", "DAMAGED", "ADJUSTMENT"]),
  quantity: z.coerce.number(), // positive for additions/purchases, or negative for wastage/deduction
  reason: z.string().max(250).optional().nullable(),
}));

export const recipeIngredientSchema = z.preprocess((val: any) => {
  if (typeof val === "object" && val !== null) {
    return {
      ...val,
      menuItemId: val.menuItemId ?? val.menu_item_id,
      variantId: val.variantId ?? val.variant_id ?? null,
      inventoryItemId: val.inventoryItemId ?? val.inventory_item_id,
      quantityRequired: val.quantityRequired ?? val.quantity_required,
    };
  }
  return val;
}, z.object({
  menuItemId: z.string().uuid("Invalid menu item ID"),
  variantId: z.string().uuid("Invalid variant ID").optional().nullable(),
  inventoryItemId: z.string().uuid("Invalid inventory item ID"),
  quantityRequired: z.coerce.number().positive("Quantity required must be greater than 0"),
}));

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;
