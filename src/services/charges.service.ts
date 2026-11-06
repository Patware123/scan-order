import { createAdminClient } from "@/lib/supabase/admin";
import {
  RestaurantChargeInput,
  UpdateRestaurantChargeInput,
} from "@/lib/validations/charges.schema";
import { ChargeBreakdown } from "@/types/order.types";
import { NotFoundError, BadRequestError } from "@/lib/utils/errors";

export async function getRestaurantCharges(
  restaurantId: string,
  options?: { activeOnly?: boolean; appliesTo?: "ALL" | "DINE_IN" | "PARCEL" }
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("restaurant_charges")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  if (options?.appliesTo) {
    query = query.in("applies_to", ["ALL", options.appliesTo]);
  }

  const { data, error } = await query;
  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    return [];
  }

  return data || [];
}

export async function createRestaurantCharge(
  restaurantId: string,
  input: RestaurantChargeInput
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("restaurant_charges")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      charge_type: input.chargeType,
      rate_or_amount: input.rateOrAmount,
      applies_to: input.appliesTo ?? "ALL",
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to create charge: ${error?.message}`);
  }

  return data;
}

export async function updateRestaurantCharge(
  restaurantId: string,
  chargeId: string,
  input: UpdateRestaurantChargeInput
) {
  const adminClient = createAdminClient();

  const updateData: {
    name?: string;
    charge_type?: "PERCENTAGE" | "FIXED";
    rate_or_amount?: number;
    applies_to?: "ALL" | "DINE_IN" | "PARCEL";
    is_active?: boolean;
    sort_order?: number;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.chargeType !== undefined) updateData.charge_type = input.chargeType;
  if (input.rateOrAmount !== undefined) updateData.rate_or_amount = input.rateOrAmount;
  if (input.appliesTo !== undefined) updateData.applies_to = input.appliesTo;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  const { data, error } = await adminClient
    .from("restaurant_charges")
    .update(updateData)
    .eq("id", chargeId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Charge not found or update failed");
  }

  return data;
}

export async function deleteRestaurantCharge(
  restaurantId: string,
  chargeId: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("restaurant_charges")
    .delete()
    .eq("id", chargeId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to delete charge: ${error.message}`);
  }

  return { success: true };
}

/**
 * Calculates all active owner-configured charges in integer paise.
 * Zero floating-point rounding errors.
 */
export async function calculateOrderCharges(
  restaurantId: string,
  subtotalPaise: number,
  orderType: "DINE_IN" | "PARCEL"
): Promise<{
  additionalChargesPaise: number;
  chargesBreakdown: ChargeBreakdown[];
}> {
  const activeCharges = await getRestaurantCharges(restaurantId, {
    activeOnly: true,
    appliesTo: orderType,
  });

  let additionalChargesPaise = 0;
  const chargesBreakdown: ChargeBreakdown[] = [];

  for (const ch of activeCharges) {
    let calculatedPaise = 0;
    if (ch.charge_type === "PERCENTAGE") {
      // rate_or_amount is percentage e.g. 5.0 for 5%
      calculatedPaise = Math.round((subtotalPaise * Number(ch.rate_or_amount)) / 100);
    } else {
      // FIXED amount in paise (or convert if stored in rupees)
      // Standard: stored as integer paise
      calculatedPaise = Math.round(Number(ch.rate_or_amount));
    }

    if (calculatedPaise > 0) {
      additionalChargesPaise += calculatedPaise;
      chargesBreakdown.push({
        id: ch.id,
        name: ch.name,
        chargeType: ch.charge_type as "PERCENTAGE" | "FIXED",
        rateOrAmount: Number(ch.rate_or_amount),
        calculatedPaise,
      });
    }
  }

  return {
    additionalChargesPaise,
    chargesBreakdown,
  };
}

