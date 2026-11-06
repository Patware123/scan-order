import { createAdminClient } from "@/lib/supabase/admin";
import {
  InventoryItemInput,
  UpdateInventoryItemInput,
  InventoryMovementInput,
  RecipeIngredientInput,
} from "@/lib/validations/inventory.schema";
import { NotFoundError, BadRequestError } from "@/lib/utils/errors";

export interface InventoryItemWithStatus {
  id: string;
  restaurant_id: string;
  name: string;
  sku: string | null;
  current_stock: number;
  unit: string;
  low_stock_threshold: number;
  purchase_price_paise: number;
  supplier_name: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export async function getInventoryItems(
  restaurantId: string
): Promise<InventoryItemWithStatus[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    return [];
  }

  return ((data || []) as Record<string, unknown>[]).map((item) => {
    const stock = Number(item.current_stock ?? 0);
    const threshold = Number(item.low_stock_threshold ?? 5);
    return {
      ...(item as unknown as InventoryItemWithStatus),
      current_stock: stock,
      low_stock_threshold: threshold,
      purchase_price_paise: Number(item.purchase_price_paise ?? 0),
      isOutOfStock: stock <= 0,
      isLowStock: stock > 0 && stock <= threshold,
    };
  });
}

export async function createInventoryItem(
  restaurantId: string,
  input: InventoryItemInput
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("inventory_items")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      sku: input.sku || null,
      current_stock: input.currentStock ?? 0,
      unit: input.unit ?? "pcs",
      low_stock_threshold: input.lowStockThreshold ?? 5,
      purchase_price_paise: input.purchasePricePaise ?? 0,
      supplier_name: input.supplierName || null,
      expiry_date: input.expiryDate || null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to create inventory item: ${error?.message}`);
  }

  // Record initial stock movement if starting stock > 0
  if (input.currentStock && input.currentStock > 0) {
    try {
      await adminClient.from("inventory_movements").insert({
        restaurant_id: restaurantId,
        inventory_item_id: data.id,
        movement_type: "PURCHASE",
        quantity: input.currentStock,
        stock_before: 0,
        stock_after: input.currentStock,
        reason: "Initial stock on item creation",
      });
    } catch {
      // Ignore if movements table pending
    }
  }

  return data;
}

export async function updateInventoryItem(
  restaurantId: string,
  itemId: string,
  input: UpdateInventoryItemInput
) {
  const adminClient = createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.sku !== undefined) updateData.sku = input.sku;
  if (input.currentStock !== undefined) updateData.current_stock = input.currentStock;
  if (input.unit !== undefined) updateData.unit = input.unit;
  if (input.lowStockThreshold !== undefined) updateData.low_stock_threshold = input.lowStockThreshold;
  if (input.purchasePricePaise !== undefined) updateData.purchase_price_paise = input.purchasePricePaise;
  if (input.supplierName !== undefined) updateData.supplier_name = input.supplierName;
  if (input.expiryDate !== undefined) updateData.expiry_date = input.expiryDate;

  const { data, error } = await adminClient
    .from("inventory_items")
    .update(updateData as any)
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Inventory item not found or update failed");
  }

  return data;
}

export async function deleteInventoryItem(
  restaurantId: string,
  itemId: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("inventory_items")
    .delete()
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to delete inventory item: ${error.message}`);
  }

  return { success: true };
}

export async function recordStockMovement(
  restaurantId: string,
  itemId: string,
  input: InventoryMovementInput,
  performedByUserId?: string | null
) {
  const adminClient = createAdminClient();

  // 1. Fetch current item
  const { data: item, error: fetchErr } = await adminClient
    .from("inventory_items")
    .select("id, name, current_stock")
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (fetchErr || !item) {
    throw new NotFoundError("Inventory item not found");
  }

  const stockBefore = Number(item.current_stock || 0);
  let delta = Number(input.quantity);

  // If type is USAGE, WASTAGE, or DAMAGED, quantity is a reduction
  if (["USAGE", "WASTAGE", "DAMAGED"].includes(input.movementType)) {
    delta = -Math.abs(delta);
  } else if (input.movementType === "PURCHASE") {
    delta = Math.abs(delta);
  }

  const stockAfter = Math.max(0, stockBefore + delta);

  // 2. Update stock on item
  const { error: updateErr } = await adminClient
    .from("inventory_items")
    .update({
      current_stock: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (updateErr) {
    throw new BadRequestError(`Failed to update item stock: ${updateErr.message}`);
  }

  // 3. Record movement audit log
  const { data: movement, error: moveErr } = await adminClient
    .from("inventory_movements")
    .insert({
      restaurant_id: restaurantId,
      inventory_item_id: itemId,
      movement_type: input.movementType,
      quantity: delta,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason: input.reason || `Manual ${input.movementType.toLowerCase()}`,
      performed_by: performedByUserId || null,
    })
    .select()
    .single();

  if (moveErr) {
    console.warn("Failed to record stock movement audit row:", moveErr);
  }

  return {
    item: { ...item, current_stock: stockAfter },
    movement,
  };
}

export async function getInventoryMovements(
  restaurantId: string,
  itemId?: string
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("inventory_movements")
    .select(`
      *,
      inventory_items (name, unit, sku)
    `)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (itemId) {
    query = query.eq("inventory_item_id", itemId);
  }

  const { data, error } = await query;
  if (error) {
    return [];
  }

  return data || [];
}

// ==========================================
// RECIPE / INGREDIENT MAPPING
// ==========================================

export async function getMenuItemIngredients(
  restaurantId: string,
  menuItemId?: string
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("menu_item_ingredients")
    .select(`
      *,
      menu_items (name),
      menu_item_variants (name),
      inventory_items (name, unit, current_stock)
    `)
    .eq("restaurant_id", restaurantId);

  if (menuItemId) {
    query = query.eq("menu_item_id", menuItemId);
  }

  const { data, error } = await query;
  if (error) {
    return [];
  }

  return data || [];
}

export async function mapRecipeIngredient(
  restaurantId: string,
  input: RecipeIngredientInput
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("menu_item_ingredients")
    .insert({
      restaurant_id: restaurantId,
      menu_item_id: input.menuItemId,
      variant_id: input.variantId || null,
      inventory_item_id: input.inventoryItemId,
      quantity_required: input.quantityRequired,
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to map recipe ingredient: ${error?.message}`);
  }

  return data;
}

export async function deleteRecipeIngredient(
  restaurantId: string,
  ingredientId: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("menu_item_ingredients")
    .delete()
    .eq("id", ingredientId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to delete recipe ingredient: ${error.message}`);
  }

  return { success: true };
}

/**
 * Deducts inventory for an accepted order based on mapped recipe ingredients.
 * Prevents duplicate deductions using `inventory_deducted` flag.
 */
export async function deductInventoryForOrder(
  restaurantId: string,
  orderId: string
) {
  const adminClient = createAdminClient();

  // 1. Fetch order and check deduction status
  const { data: order, error: orderErr } = await adminClient
    .from("orders")
    .select("id, order_number, order_status, inventory_deducted")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (orderErr || !order) {
    return { success: false, reason: "Order not found" };
  }

  const isDeducted = (order as unknown as { inventory_deducted?: boolean }).inventory_deducted;
  if (isDeducted) {
    return { success: true, reason: "Already deducted (idempotent skipped)" };
  }

  // 2. Fetch order items
  const { data: items } = await adminClient
    .from("order_items")
    .select("menu_item_id, variant_id, quantity, item_name_snapshot")
    .eq("order_id", orderId);

  if (!items || items.length === 0) {
    return { success: true, reason: "No items in order" };
  }

  // 3. For each item, look up mapped ingredients and deduct stock
  for (const oi of items) {
    if (!oi.menu_item_id) continue;

    let ingredientQuery = adminClient
      .from("menu_item_ingredients")
      .select("inventory_item_id, quantity_required")
      .eq("restaurant_id", restaurantId)
      .eq("menu_item_id", oi.menu_item_id);

    if (oi.variant_id) {
      ingredientQuery = ingredientQuery.eq("variant_id", oi.variant_id);
    }

    const { data: ingredients } = await ingredientQuery;

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        const totalUsed = Number(ing.quantity_required) * Number(oi.quantity);
        try {
          await recordStockMovement(
            restaurantId,
            ing.inventory_item_id,
            {
              movementType: "USAGE",
              quantity: totalUsed,
              reason: `Order ${order.order_number}: ${oi.item_name_snapshot} x${oi.quantity}`,
            }
          );
        } catch (e) {
          console.warn("Stock deduction warning for item:", ing.inventory_item_id, e);
        }
      }
    }
  }

  // 4. Mark order as inventory_deducted = true
  try {
    await adminClient
      .from("orders")
      .update({
        inventory_deducted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Failed to set inventory_deducted on order:", err);
  }

  return { success: true };
}

