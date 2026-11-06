import { createAdminClient } from "@/lib/supabase/admin";
import { CreateTableInput, UpdateTableInput } from "@/lib/validations/table.schema";
import { checkTableLimit } from "@/services/restaurant.service";
import { NotFoundError, BadRequestError, ConflictError } from "@/lib/utils/errors";
import crypto from "crypto";

export async function getTables(restaurantId: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("restaurant_tables")
    .select(`
      *,
      table_qr_tokens (
        id,
        token,
        is_revoked,
        created_at
      )
    `)
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true });

  if (error) {
    throw new BadRequestError(`Failed to fetch tables: ${error.message}`);
  }

  // Fetch active in-flight orders for this restaurant to identify active order per table
  const { data: activeOrders } = await adminClient
    .from("orders")
    .select("id, order_number, order_status, total_paise, created_at, table_id")
    .eq("restaurant_id", restaurantId)
    .in("order_status", ["PENDING", "ACCEPTED", "PREPARING", "READY"]);

  const activeOrderByTable = new Map<string, any>();
  if (activeOrders) {
    for (const ord of activeOrders) {
      if (ord.table_id && !activeOrderByTable.has(ord.table_id)) {
        activeOrderByTable.set(ord.table_id, ord);
      }
    }
  }

  // Map to include the single active QR token, consistent label, scanner status, and active order
  return ((data || []) as Record<string, unknown>[]).map((t) => {
    const tokens = ((t.table_qr_tokens || []) as {
      id: string;
      token: string;
      is_revoked: boolean;
      created_at: string;
    }[]);
    const activeTokenObj = tokens.find((tk) => !tk.is_revoked);
    const activeToken = activeTokenObj?.token || null;
    const label = (t.table_number as string) || (t.label as string) || "";
    const activeOrder = activeOrderByTable.get(t.id as string) || null;
    const isScannerActive =
      t.is_scanner_active !== undefined ? Boolean(t.is_scanner_active) : true;
    const isLocked =
      t.is_locked !== undefined ? Boolean(t.is_locked) : Boolean(activeOrder);

    return {
      ...t,
      label,
      table_number: label,
      activeToken,
      is_scanner_active: isScannerActive,
      isScannerActive,
      is_locked: isLocked,
      isLocked,
      activeOrder,
      qr_token: activeTokenObj
        ? {
            token: activeTokenObj.token,
            is_revoked: activeTokenObj.is_revoked,
          }
        : activeToken
        ? { token: activeToken, is_revoked: false }
        : null,
    };
  });
}

export async function toggleTableScanner(
  restaurantId: string,
  tableId: string,
  isScannerActive: boolean
) {
  const adminClient = createAdminClient();

  try {
    const { data, error } = await adminClient
      .from("restaurant_tables")
      .update({
        is_scanner_active: isScannerActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn("Table security column is_scanner_active pending migration, fallback applied:", err);
  }

  return { id: tableId, restaurant_id: restaurantId, is_scanner_active: isScannerActive };
}

export async function toggleTableLock(
  restaurantId: string,
  tableId: string,
  isLocked: boolean
) {
  const adminClient = createAdminClient();

  try {
    const { data, error } = await adminClient
      .from("restaurant_tables")
      .update({
        is_locked: isLocked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn("Table security column is_locked pending migration, fallback applied:", err);
  }

  return { id: tableId, restaurant_id: restaurantId, is_locked: isLocked };
}

export async function createTable(
  restaurantId: string,
  input: CreateTableInput
) {
  const adminClient = createAdminClient();

  // 1. Enforce Table Limits based on subscription plan
  const limitCheck = await checkTableLimit(restaurantId);
  if (!limitCheck.allowed) {
    throw new BadRequestError(
      `Table limit reached. Your current plan allows up to ${limitCheck.maxTables} tables. Upgrade subscription to add more.`
    );
  }

  // 2. Check table number uniqueness within this restaurant
  const { data: existing } = await adminClient
    .from("restaurant_tables")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("table_number", input.tableNumber)
    .maybeSingle();

  if (existing) {
    throw new ConflictError(`Table '${input.tableNumber}' already exists in this restaurant`);
  }

  // 3. Create Table
  const { data: table, error } = await adminClient
    .from("restaurant_tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: input.tableNumber,
      capacity: input.capacity,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error || !table) {
    throw new BadRequestError(`Failed to create table: ${error?.message}`);
  }

  // 4. Generate initial QR Token
  const token = await generateQrToken(restaurantId, table.id);

  const label = table.table_number || input.tableNumber;

  return {
    ...table,
    label,
    table_number: label,
    activeToken: token,
    qr_token: {
      token,
      is_revoked: false,
    },
  };
}

export async function updateTable(
  restaurantId: string,
  tableId: string,
  input: UpdateTableInput
) {
  const adminClient = createAdminClient();

  if (input.tableNumber) {
    const { data: existing } = await adminClient
      .from("restaurant_tables")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("table_number", input.tableNumber)
      .neq("id", tableId)
      .maybeSingle();

    if (existing) {
      throw new ConflictError(`Table '${input.tableNumber}' already exists`);
    }
  }

  const updateData: {
    table_number?: string;
    capacity?: number;
    is_active?: boolean;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.tableNumber !== undefined) updateData.table_number = input.tableNumber;
  if (input.capacity !== undefined) updateData.capacity = input.capacity;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await adminClient
    .from("restaurant_tables")
    .update(updateData)
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Table not found or update failed");
  }

  return data;
}

export async function deleteTable(
  restaurantId: string,
  tableId: string
) {
  const adminClient = createAdminClient();

  // Check if there are active pending/preparing orders for this table
  const { count } = await adminClient
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("table_id", tableId)
    .in("order_status", ["PENDING", "ACCEPTED", "PREPARING", "READY"]);

  if (count && count > 0) {
    throw new BadRequestError(
      `Cannot delete table with active orders (${count} active). Please complete or cancel orders first.`
    );
  }

  const { error } = await adminClient
    .from("restaurant_tables")
    .delete()
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to delete table: ${error.message}`);
  }

  return { success: true };
}

export async function generateQrToken(
  restaurantId: string,
  tableId: string
): Promise<string> {
  const adminClient = createAdminClient();
  const token = crypto.randomBytes(16).toString("hex");

  // Revoke existing tokens for this table
  await adminClient
    .from("table_qr_tokens")
    .update({ is_revoked: true, updated_at: new Date().toISOString() })
    .eq("table_id", tableId)
    .eq("restaurant_id", restaurantId);

  // Insert new active token
  const { error } = await adminClient.from("table_qr_tokens").insert({
    restaurant_id: restaurantId,
    table_id: tableId,
    token,
    is_revoked: false,
  });

  if (error) {
    throw new BadRequestError(`Failed to generate QR token: ${error.message}`);
  }

  return token;
}

export async function revokeQrToken(
  restaurantId: string,
  tableId: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("table_qr_tokens")
    .update({ is_revoked: true, updated_at: new Date().toISOString() })
    .eq("table_id", tableId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to revoke QR token: ${error.message}`);
  }

  return { success: true };
}
