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

  // Map to include the single active QR token and consistent label / qr_token fields
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
    return {
      ...t,
      label,
      table_number: label,
      activeToken,
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
