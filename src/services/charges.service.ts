import { createAdminClient } from "@/lib/supabase/admin";
import {
  RestaurantChargeInput,
  UpdateRestaurantChargeInput,
  TaxConfigInput,
} from "@/lib/validations/charges.schema";
import { ChargeBreakdown } from "@/types/order.types";
import { NotFoundError, BadRequestError } from "@/lib/utils/errors";

export interface RestaurantTaxConfig {
  isGstEnabled: boolean;
  gstPercentage: number;
  gstNumber: string | null;
}

/**
 * Resolves the restaurant's configured Taxes (GST) percentage and status.
 * If not configured or disabled, isGstEnabled is false and gstPercentage is 0.
 */
export async function getRestaurantTaxConfig(
  restaurantId: string
): Promise<RestaurantTaxConfig> {
  const adminClient = createAdminClient();

  // 1. Fetch restaurant row for gst_number
  const { data: restaurant } = await adminClient
    .from("restaurants")
    .select("gst_number")
    .eq("id", restaurantId)
    .maybeSingle();

  // 2. Fetch charges for active GST charge
  const { data: charges } = await adminClient
    .from("restaurant_charges")
    .select("rate_or_amount, is_active, name")
    .eq("restaurant_id", restaurantId)
    .ilike("name", "%gst%");

  const activeGstCharge = charges?.find(
    (c) => c.is_active && Number(c.rate_or_amount) > 0
  );

  // 3. Check branding tagline tag [GST:X]
  const { data: branding } = await adminClient
    .from("restaurant_branding")
    .select("tagline")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const gstTagMatch = branding?.tagline?.match(/\[GST:([0-9.]+)\]/);
  const tagGstRate = gstTagMatch ? parseFloat(gstTagMatch[1]) : null;

  if (activeGstCharge) {
    return {
      isGstEnabled: true,
      gstPercentage: Number(activeGstCharge.rate_or_amount),
      gstNumber: restaurant?.gst_number || null,
    };
  }

  if (tagGstRate !== null && tagGstRate > 0) {
    return {
      isGstEnabled: true,
      gstPercentage: tagGstRate,
      gstNumber: restaurant?.gst_number || null,
    };
  }

  return {
    isGstEnabled: false,
    gstPercentage: 0,
    gstNumber: restaurant?.gst_number || null,
  };
}

/**
 * Updates the restaurant's Taxes (GST) configuration.
 * Configures the percentage, creates/updates the GST charge, updates branding tagline,
 * updates restaurants.gst_number, and syncs menu_items tax_rate_percentage.
 */
export async function updateRestaurantTaxConfig(
  restaurantId: string,
  input: TaxConfigInput
): Promise<RestaurantTaxConfig> {
  const adminClient = createAdminClient();

  const isEnabled = Boolean(input.isGstEnabled && input.gstPercentage > 0);
  const gstRate = isEnabled ? Number(input.gstPercentage) : 0;

  // 1. Update GST Number on restaurants table if provided
  if (input.gstNumber !== undefined) {
    await adminClient
      .from("restaurants")
      .update({
        gst_number: input.gstNumber?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", restaurantId);
  }

  // 2. Update branding tagline metadata tag [GST:X], preserving [TABLE_LIMIT:X]
  const { data: branding } = await adminClient
    .from("restaurant_branding")
    .select("tagline")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  let tagline = branding?.tagline || "";
  tagline = tagline.replace(/\[GST:[^\]]+\]\s*/g, "").trim();
  if (isEnabled) {
    tagline = `[GST:${gstRate}] ${tagline}`.trim();
  }

  await adminClient
    .from("restaurant_branding")
    .update({
      tagline: tagline || null,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  // 3. Upsert or update GST charge in restaurant_charges
  const { data: existingGstCharges } = await adminClient
    .from("restaurant_charges")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .ilike("name", "%gst%");

  if (isEnabled) {
    if (existingGstCharges && existingGstCharges.length > 0) {
      const [primaryGst, ...duplicates] = existingGstCharges;
      await adminClient
        .from("restaurant_charges")
        .update({
          name: "GST",
          charge_type: "PERCENTAGE",
          rate_or_amount: gstRate,
          is_active: true,
          applies_to: "ALL",
          sort_order: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", primaryGst.id);

      for (const dup of duplicates) {
        await adminClient
          .from("restaurant_charges")
          .update({ is_active: false })
          .eq("id", dup.id);
      }
    } else {
      await adminClient.from("restaurant_charges").insert({
        restaurant_id: restaurantId,
        name: "GST",
        charge_type: "PERCENTAGE",
        rate_or_amount: gstRate,
        is_active: true,
        applies_to: "ALL",
        sort_order: 0,
      });
    }
  } else {
    // Disabled: set all GST charges to inactive
    if (existingGstCharges && existingGstCharges.length > 0) {
      for (const ch of existingGstCharges) {
        await adminClient
          .from("restaurant_charges")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", ch.id);
      }
    }
  }

  // 4. Update menu_items tax_rate_percentage to stay in sync
  try {
    await adminClient
      .from("menu_items")
      .update({
        tax_rate_percentage: gstRate,
        updated_at: new Date().toISOString(),
      })
      .eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Could not batch update menu_items tax_rate_percentage:", err);
  }

  return {
    isGstEnabled: isEnabled,
    gstPercentage: gstRate,
    gstNumber: input.gstNumber?.trim() || null,
  };
}

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
    // Skip GST charges here as Taxes (GST) are calculated into tax_paise
    if (ch.name.toLowerCase().includes("gst")) {
      continue;
    }

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

