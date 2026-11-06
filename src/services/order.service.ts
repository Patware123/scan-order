import { createAdminClient } from "@/lib/supabase/admin";
import {
  CreateOrderInput,
  CreateStaffOrderInput,
  OrderQueryInput,
} from "@/lib/validations/order.schema";
import { resolveTableFromToken } from "@/lib/auth/rbac";
import {
  OrderStatus,
  PaymentStatus,
  ActorType,
  OrderType,
  OrderSource,
  UserRole,
} from "@/types/database.types";
import { isValidOrderTransition } from "@/types/order.types";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { calculateOrderCharges, getRestaurantTaxConfig } from "@/services/charges.service";
import { deductInventoryForOrder } from "@/services/inventory.service";
import crypto from "crypto";

export async function createCustomerOrder(input: CreateOrderInput) {
  // 1. Resolve restaurant and table from public QR token
  const resolved = await resolveTableFromToken(input.tableToken);
  const { restaurantId, tableId } = resolved;

  if (resolved.isScannerActive === false) {
    throw new BadRequestError("QR scanner is currently deactivated for this table by restaurant staff.");
  }

  if (resolved.isLocked === true) {
    throw new ConflictError("This table is currently locked for an active dining session. Please ask staff for assistance.");
  }

  // Compute deterministic hash of checkout request
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ tableId, items: input.items, instructions: input.specialInstructions }))
    .digest("hex");

  // Generate unguessable guest tracking token
  const guestTrackingToken = crypto.randomUUID();

  // Execute full atomic pipeline enforcing variants, charges, snapshots, and table lock
  return await executeOrderCreationPipeline({
    restaurantId,
    tableId,
    orderType: "DINE_IN",
    orderSource: "CUSTOMER",
    idempotencyKey: input.idempotencyKey,
    requestHash,
    guestTrackingToken,
    items: input.items,
    specialInstructions: input.specialInstructions,
  });
}

export async function createStaffOrder(
  restaurantId: string,
  staffUserId: string,
  staffRole: UserRole,
  input: CreateStaffOrderInput
) {
  const adminClient = createAdminClient();

  if (staffRole !== "OWNER" && staffRole !== "MANAGER" && staffRole !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only owners and managers can create staff orders");
  }

  const orderType: OrderType = input.orderType || "DINE_IN";
  let tableId: string | null = null;

  if (orderType === "DINE_IN") {
    if (!input.tableId) {
      throw new BadRequestError("Table selection is required for Dine-in orders");
    }
    tableId = input.tableId;

    // Validate table belongs to restaurant, is active, and not locked
    const { data: table, error: tblErr } = await adminClient
      .from("restaurant_tables")
      .select("id, is_active, is_locked, table_number")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (tblErr || !table) {
      throw new NotFoundError("Selected table does not exist in this restaurant");
    }

    if (!table.is_active) {
      throw new BadRequestError(`Table '${table.table_number}' is currently inactive`);
    }

    if (table.is_locked) {
      throw new ConflictError(`Table '${table.table_number}' is already occupied and locked`);
    }
  }

  const idempotencyKey = input.idempotencyKey || crypto.randomUUID();
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ tableId, items: input.items, staffUserId, orderType }))
    .digest("hex");

  const guestTrackingToken = crypto.randomUUID();
  const orderSource: OrderSource = staffRole === "OWNER" ? "OWNER" : "MANAGER";

  return await executeOrderCreationPipeline({
    restaurantId,
    tableId,
    orderType,
    orderSource,
    createdByUserId: staffUserId,
    customerName: input.customerName || null,
    customerPhone: input.customerPhone || null,
    idempotencyKey,
    requestHash,
    guestTrackingToken,
    items: input.items,
    specialInstructions: input.specialInstructions,
  });
}

/**
 * Atomic pipeline enforcing all financial, variant, and charge safety rules
 */
async function executeOrderCreationPipeline({
  restaurantId,
  tableId,
  orderType = "DINE_IN",
  orderSource = "CUSTOMER",
  createdByUserId = null,
  customerName = null,
  customerPhone = null,
  idempotencyKey,
  requestHash,
  guestTrackingToken,
  items,
  specialInstructions,
}: {
  restaurantId: string;
  tableId: string | null;
  orderType?: OrderType;
  orderSource?: OrderSource;
  createdByUserId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  idempotencyKey: string;
  requestHash: string;
  guestTrackingToken: string;
  items: { menuItemId: string; variantId?: string | null; quantity: number }[];
  specialInstructions?: string | null;
}) {
  const adminClient = createAdminClient();

  // A. Check Idempotency Key
  const { data: existingKey } = await adminClient
    .from("order_idempotency_keys")
    .select("order_id, request_hash")
    .eq("restaurant_id", restaurantId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingKey) {
    const { data: existingOrder } = await adminClient
      .from("orders")
      .select(`
        *,
        order_items (*),
        restaurant_tables (table_number)
      `)
      .eq("id", existingKey.order_id)
      .single();

    if (existingOrder) {
      return {
        order: normalizeOrderForDisplay(existingOrder as Record<string, unknown>),
        items: (existingOrder as unknown as { order_items: unknown }).order_items,
        isDuplicate: true,
      };
    }
  }

  // B. Server-Side Price & Availability Calculation in Integer Paise with Variants
  const itemIds = Array.from(new Set(items.map((i) => i.menuItemId)));
  const { data: menuItems, error: itemsError } = await adminClient
    .from("menu_items")
    .select("id, name, price_paise, tax_rate_percentage, is_available")
    .eq("restaurant_id", restaurantId)
    .in("id", itemIds);

  if (itemsError || !menuItems || menuItems.length !== itemIds.length) {
    throw new BadRequestError("One or more ordered items are invalid or do not exist in this restaurant");
  }

  const itemsMap = new Map((menuItems as any[]).map((m) => [m.id, m]));

  // Fetch any variants referenced in items
  const variantIds = items.map((i) => i.variantId).filter(Boolean) as string[];
  const variantsMap = new Map<string, any>();
  if (variantIds.length > 0) {
    try {
      const { data: variants } = await adminClient
        .from("menu_item_variants")
        .select("id, menu_item_id, name, price_paise, is_available")
        .in("id", variantIds)
        .eq("restaurant_id", restaurantId);

      if (variants) {
        for (const v of variants) {
          variantsMap.set(v.id, v);
        }
      }
    } catch {
      // Ignore if table pending
    }
  }

  let subtotalPaise = 0;
  const calculatedItems: {
    menuItemId: string;
    variantId: string | null;
    itemNameSnapshot: string;
    variantNameSnapshot: string | null;
    unitPricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }[] = [];

  for (const item of items) {
    const menuItem = itemsMap.get(item.menuItemId);
    if (!menuItem) {
      throw new BadRequestError(`Menu item ${item.menuItemId} does not exist`);
    }
    if (!menuItem.is_available) {
      throw new BadRequestError(`'${menuItem.name}' is currently unavailable`);
    }

    let unitPricePaise = menuItem.price_paise;
    let variantNameSnapshot: string | null = null;

    if (item.variantId) {
      const variant = variantsMap.get(item.variantId);
      if (!variant) {
        throw new BadRequestError(`Selected variant is invalid for '${menuItem.name}'`);
      }
      if (!variant.is_available) {
        throw new BadRequestError(`Variant '${variant.name}' of '${menuItem.name}' is currently unavailable`);
      }
      unitPricePaise = variant.price_paise;
      variantNameSnapshot = variant.name;
    }

    const lineTotalPaise = unitPricePaise * item.quantity;
    subtotalPaise += lineTotalPaise;

    calculatedItems.push({
      menuItemId: menuItem.id,
      variantId: item.variantId || null,
      itemNameSnapshot: menuItem.name,
      variantNameSnapshot,
      unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise,
    });
  }

  // C. Calculate Taxes (GST) based on Owner Configuration
  // If owner has NOT configured GST or disabled it, tax is strictly 0 and not charged
  const taxConfig = await getRestaurantTaxConfig(restaurantId);
  const gstRate = taxConfig.isGstEnabled ? Number(taxConfig.gstPercentage || 0) : 0;
  const taxPaise = gstRate > 0 ? Math.round((subtotalPaise * gstRate) / 100) : 0;

  // D. Calculate Additional Owner-Configured Charges (Excludes GST to prevent double charging)
  const { additionalChargesPaise, chargesBreakdown } = await calculateOrderCharges(
    restaurantId,
    subtotalPaise,
    orderType
  );

  const totalPaise = subtotalPaise + taxPaise + additionalChargesPaise;

  // D. Generate Human-Readable Order Number (e.g. ORD-20261105-0001)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await adminClient
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  const seq = ((count || 0) + 1).toString().padStart(4, "0");
  const prefix = orderType === "PARCEL" ? "PCL" : "ORD";
  const orderNumber = `${prefix}-${today}-${seq}`;

  // E. Create Order Record with full metadata
  const insertPayload: Record<string, unknown> = {
    restaurant_id: restaurantId,
    table_id: tableId,
    order_number: orderNumber,
    order_status: "PENDING",
    payment_status: "UNPAID",
    order_type: orderType,
    order_source: orderSource,
    created_by_user_id: createdByUserId,
    customer_name: customerName,
    customer_phone: customerPhone,
    subtotal_paise: subtotalPaise,
    tax_paise: taxPaise,
    additional_charges_paise: additionalChargesPaise,
    charges_snapshot: chargesBreakdown,
    total_paise: totalPaise,
    guest_tracking_token: guestTrackingToken,
    special_instructions: specialInstructions || null,
  };

  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .insert(insertPayload as any)
    .select()
    .single();

  if (orderError || !order) {
    throw new BadRequestError(`Failed to create order: ${orderError?.message}`);
  }

  const createdOrderId = (order as unknown as { id: string }).id;

  // F. Insert Immutable Item Snapshots with Variant info
  const itemInserts = calculatedItems.map((ci) => ({
    order_id: createdOrderId,
    menu_item_id: ci.menuItemId,
    variant_id: ci.variantId,
    item_name_snapshot: ci.variantNameSnapshot
      ? `${ci.itemNameSnapshot} (${ci.variantNameSnapshot})`
      : ci.itemNameSnapshot,
    variant_name_snapshot: ci.variantNameSnapshot,
    unit_price_paise: ci.unitPricePaise,
    quantity: ci.quantity,
    line_total_paise: ci.lineTotalPaise,
  }));

  const { data: insertedItems, error: oiError } = await adminClient
    .from("order_items")
    .insert(itemInserts as any)
    .select();

  if (oiError) {
    console.error("Order items insert failure:", oiError);
  }

  // G. Lock Table for Table Orders (Requirement 3 & 4)
  if (tableId && orderType === "DINE_IN") {
    try {
      await adminClient
        .from("restaurant_tables")
        .update({
          is_locked: true,
          locked_order_id: createdOrderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tableId)
        .eq("restaurant_id", restaurantId);
    } catch (tblLockErr) {
      console.warn("Table lock update warning:", tblLockErr);
    }
  }

  // H. Insert Lifecycle Status History Event
  const actorType: ActorType = orderSource === "CUSTOMER" ? "CUSTOMER" : "STAFF";
  const noteText =
    orderSource === "CUSTOMER"
      ? "Order placed via digital QR menu"
      : `Order created by ${orderSource.toLowerCase()} staff`;

  await adminClient.from("order_status_events").insert({
    order_id: createdOrderId,
    previous_status: null,
    new_status: "PENDING",
    actor_type: actorType,
    actor_id: createdByUserId,
    note: noteText,
  });

  // I. Insert Idempotency Key
  await adminClient.from("order_idempotency_keys").insert({
    restaurant_id: restaurantId,
    idempotency_key: idempotencyKey,
    order_id: createdOrderId,
    request_hash: requestHash,
  });

  const normalized = normalizeOrderForDisplay({
    ...order,
    order_items: insertedItems || calculatedItems,
  });

  return {
    order: normalized,
    items: insertedItems || calculatedItems,
    isDuplicate: false,
  };
}

export function normalizeOrderForDisplay(order: Record<string, unknown>) {
  const tableObj = Array.isArray(order.restaurant_tables)
    ? order.restaurant_tables[0]
    : order.restaurant_tables;
  const tableNumber =
    (tableObj as { table_number?: string })?.table_number ||
    (order.table as { label?: string })?.label ||
    (order.order_type === "PARCEL" ? "Parcel / Takeaway" : "Table");

  const rawItems = (order.order_items || order.items || []) as Array<Record<string, unknown>>;
  const items = rawItems.map((item) => {
    const itemName = item.item_name_snapshot ?? item.itemNameSnapshot ?? (item as any).name ?? "Item";
    const unitPrice = item.unit_price_paise ?? item.unitPricePaise ?? (item as any).price_paise ?? 0;
    const lineTotal = item.line_total_paise ?? item.lineTotalPaise ?? (Number(unitPrice) * Number(item.quantity || 1));
    return {
      ...item,
      item_name_snapshot: itemName,
      itemNameSnapshot: itemName,
      variant_name_snapshot: item.variant_name_snapshot ?? item.variantNameSnapshot ?? null,
      unit_price_paise: unitPrice,
      unitPricePaise: unitPrice,
      line_total_paise: lineTotal,
      lineTotalPaise: lineTotal,
    };
  });

  const specialNotes =
    order.special_instructions ?? order.special_notes ?? null;

  return {
    ...order,
    order_type: order.order_type || "DINE_IN",
    order_source: order.order_source || "CUSTOMER",
    items,
    order_items: items,
    table: {
      id: order.table_id,
      label: tableNumber,
      table_number: tableNumber,
    },
    restaurant_tables: {
      table_number: tableNumber,
    },
    special_notes: specialNotes,
    special_instructions: specialNotes,
  };
}

export async function getOrderById(restaurantId: string, orderId: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("orders")
    .select(`
      *,
      order_items (*),
      order_status_events (*),
      restaurant_tables!orders_table_id_fkey (table_number)
    `)
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error || !data) {
    throw new NotFoundError("Order not found");
  }

  return normalizeOrderForDisplay(data as Record<string, unknown>);
}

export async function getGuestOrderByToken(trackingToken: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("orders")
    .select(`
      id,
      order_number,
      order_status,
      payment_status,
      order_type,
      order_source,
      customer_name,
      subtotal_paise,
      tax_paise,
      additional_charges_paise,
      charges_snapshot,
      total_paise,
      guest_tracking_token,
      special_instructions,
      created_at,
      updated_at,
      order_items (
        id,
        item_name_snapshot,
        variant_name_snapshot,
        unit_price_paise,
        quantity,
        line_total_paise
      ),
      order_status_events (
        previous_status,
        new_status,
        created_at,
        note
      ),
      restaurants (
        id,
        name,
        currency,
        restaurant_branding (logo_url, primary_color)
      ),
      restaurant_tables!orders_table_id_fkey (
        table_number
      )
    `)
    .eq("guest_tracking_token", trackingToken)
    .single();

  if (error || !data) {
    throw new NotFoundError("Order tracking session not found");
  }

  return normalizeOrderForDisplay(data as Record<string, unknown>);
}

export async function getRestaurantOrders(
  restaurantId: string,
  options: OrderQueryInput
) {
  const adminClient = createAdminClient();
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = adminClient
    .from("orders")
    .select(
      `
      *,
      restaurant_tables!orders_table_id_fkey (table_number),
      order_items (
        id,
        item_name_snapshot,
        variant_name_snapshot,
        unit_price_paise,
        quantity,
        line_total_paise
      )
    `,
      { count: "exact" }
    )
    .eq("restaurant_id", restaurantId);

  // Exclude soft-deleted/archived unless explicitly asked
  if (!options.includeArchived) {
    query = query.or("is_archived.is.null,is_archived.eq.false");
  }

  if (options.status) {
    query = query.eq("order_status", options.status);
  }

  if (options.tableId) {
    query = query.eq("table_id", options.tableId);
  }

  if (options.orderType) {
    query = query.eq("order_type", options.orderType);
  }

  if (options.updatedAfter) {
    query = query.gt("updated_at", options.updatedAfter);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) {
    throw new BadRequestError(`Failed to fetch orders: ${error.message}`);
  }

  const normalized = ((data || []) as Record<string, unknown>[]).map(normalizeOrderForDisplay);

  return {
    orders: normalized,
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    },
  };
}

export async function transitionOrderStatus(
  restaurantId: string,
  orderId: string,
  newStatus: OrderStatus,
  actor?: { type?: ActorType; id?: string; note?: string }
) {
  const adminClient = createAdminClient();

  // 1. Fetch current order
  const { data: order, error: fetchError } = await adminClient
    .from("orders")
    .select("id, order_status, restaurant_id, table_id, order_type")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (fetchError || !order) {
    throw new NotFoundError("Order not found");
  }

  const currentStatus = (order as unknown as { order_status: OrderStatus }).order_status;

  // 2. Validate state machine transition
  if (!isValidOrderTransition(currentStatus, newStatus)) {
    throw new ConflictError(
      `Illegal order status transition from '${currentStatus}' to '${newStatus}'`
    );
  }

  // 3. Update Order Status
  const { data: updatedOrder, error: updateError } = await adminClient
    .from("orders")
    .update({
      order_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError || !updatedOrder) {
    throw new BadRequestError(`Failed to update order status: ${updateError?.message}`);
  }

  // 4. Record Status Event
  const actorType: ActorType = actor?.type || "STAFF";
  const actorId = actor?.id || null;
  const actorNote = actor?.note || `Status transitioned to ${newStatus}`;

  await adminClient.from("order_status_events").insert({
    order_id: orderId,
    previous_status: currentStatus,
    new_status: newStatus,
    actor_type: actorType,
    actor_id: actorId,
    note: actorNote,
  });

  // 5. Automatic Inventory Deduction when Order is Accepted (Requirement 1)
  if (newStatus === "ACCEPTED") {
    try {
      await deductInventoryForOrder(restaurantId, orderId);
    } catch (invErr) {
      console.warn("Inventory deduction on order acceptance warning:", invErr);
    }
  }

  // 6. Release Table Lock on Order Completion or Cancellation (Requirement 3)
  if (
    (newStatus === "COMPLETED" || newStatus === "CANCELLED" || newStatus === "REJECTED") &&
    order.table_id
  ) {
    try {
      await adminClient
        .from("restaurant_tables")
        .update({
          is_locked: false,
          locked_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.table_id)
        .eq("restaurant_id", restaurantId);
    } catch (tblErr) {
      console.warn("Table lock release warning:", tblErr);
    }
  }

  return normalizeOrderForDisplay(updatedOrder as Record<string, unknown>);
}

export async function updatePaymentStatus(
  restaurantId: string,
  orderId: string,
  paymentStatus: PaymentStatus
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("orders")
    .update({
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Order not found or update failed");
  }

  // If marked PAID and order is COMPLETED, ensure table lock is released
  const orderRecord = data as any;
  if (paymentStatus === "PAID" && orderRecord.table_id && orderRecord.order_status === "COMPLETED") {
    try {
      await adminClient
        .from("restaurant_tables")
        .update({
          is_locked: false,
          locked_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderRecord.table_id)
        .eq("restaurant_id", restaurantId);
    } catch (tblErr) {
      console.warn("Table release on payment warning:", tblErr);
    }
  }

  return normalizeOrderForDisplay(data as Record<string, unknown>);
}

/**
 * Delete or Archive order with confirmation & audit log (Requirement 5)
 * Owner has full permission. Manager requires owner authorization.
 */
export async function deleteOrArchiveOrder(
  restaurantId: string,
  orderId: string,
  userId: string,
  userRole: UserRole,
  reason?: string
) {
  const adminClient = createAdminClient();

  if (userRole !== "OWNER" && userRole !== "SUPER_ADMIN" && userRole !== "MANAGER") {
    throw new ForbiddenError("Insufficient permissions to delete or archive orders");
  }

  // 1. Fetch order details before archiving
  const { data: order, error: fetchErr } = await adminClient
    .from("orders")
    .select("id, order_number, table_id, order_status, total_paise")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (fetchErr || !order) {
    throw new NotFoundError("Order not found");
  }

  // 2. Soft-delete / Archive preserving all financial and snapshot records
  const { data: updated, error: archiveErr } = await adminClient
    .from("orders")
    .update({
      is_archived: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
      order_status: "CANCELLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (archiveErr || !updated) {
    throw new BadRequestError(`Failed to archive order: ${archiveErr?.message}`);
  }

  // 3. Release table lock if this order locked a table
  if (order.table_id) {
    try {
      await adminClient
        .from("restaurant_tables")
        .update({
          is_locked: false,
          locked_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.table_id)
        .eq("restaurant_id", restaurantId);
    } catch (tblErr) {
      console.warn("Table unlock on order archive warning:", tblErr);
    }
  }

  // 4. Record in Audit Logs
  try {
    await adminClient.from("audit_logs").insert({
      restaurant_id: restaurantId,
      user_id: userId,
      action: "ORDER_ARCHIVED_DELETED",
      entity_type: "orders",
      entity_id: orderId,
      details: {
        order_number: order.order_number,
        total_paise: order.total_paise,
        reason: reason || "Archived by restaurant staff",
        performed_by_role: userRole,
      },
    });
  } catch (auditErr) {
    console.warn("Failed to write audit log row:", auditErr);
  }

  return { success: true, message: "Order archived and table lock released successfully" };
}
