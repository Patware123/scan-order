import { createAdminClient } from "@/lib/supabase/admin";
import { CreateRestaurantInput, UpdateRestaurantInput, UpdateBrandingInput } from "@/lib/validations/restaurant.schema";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/utils/errors";

export async function createRestaurant(
  input: CreateRestaurantInput & {
    contactEmail?: string;
    contactPhone?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    planCode?: string;
    maxTables?: number;
    ownerName?: string;
    ownerPhone?: string | null;
    ownerPassword?: string;
  },
  ownerUserId?: string
) {
  const adminClient = createAdminClient();

  // 1. Check slug uniqueness
  const { data: existing } = await adminClient
    .from("restaurants")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();

  if (existing) {
    throw new ConflictError(`Restaurant with slug '${input.slug}' already exists`);
  }

  // 2. Resolve or create Owner account if credentials provided
  let resolvedOwnerId = ownerUserId;
  const ownerEmail = input.ownerEmail || (input as any).email;
  const ownerPassword = input.ownerPassword;
  const ownerName = input.ownerName || "Restaurant Owner";
  const ownerPhone = input.ownerPhone || input.contactPhone || null;

  if (ownerEmail && ownerPassword) {
    // Check if user already exists
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === ownerEmail.toLowerCase()
    );

    if (existingAuthUser) {
      resolvedOwnerId = existingAuthUser.id;
      // Update password and metadata
      await adminClient.auth.admin.updateUserById(resolvedOwnerId, {
        password: ownerPassword,
        user_metadata: {
          full_name: ownerName,
          phone: ownerPhone,
        },
      });
    } else {
      const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        user_metadata: {
          full_name: ownerName,
          phone: ownerPhone,
        },
      });

      if (authErr || !createdAuth?.user) {
        throw new BadRequestError(`Failed to create owner account: ${authErr?.message}`);
      }

      resolvedOwnerId = createdAuth.user.id;
    }
  }

  // 3. Resolve subscription plan
  const targetPlanCode = (input.planCode || "MONTHLY").toUpperCase();
  let { data: selectedPlan } = await adminClient
    .from("subscription_plans")
    .select("id, code, name, price_paise, billing_period, max_tables")
    .eq("code", targetPlanCode)
    .maybeSingle();

  if (!selectedPlan) {
    // Fallback to FREE or first active plan
    const { data: fallbackPlan } = await adminClient
      .from("subscription_plans")
      .select("id, code, name, price_paise, billing_period, max_tables")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    selectedPlan = fallbackPlan;
  }

  // 4. Calculate table limit & subscription period
  const tableLimit = input.maxTables || 10;
  const now = new Date();
  const startDate = new Date(now);
  const expiryDate = new Date(now);

  if (targetPlanCode === "ANNUAL") {
    expiryDate.setDate(expiryDate.getDate() + 365);
  } else if (targetPlanCode === "SIX_MONTH") {
    expiryDate.setDate(expiryDate.getDate() + 180);
  } else {
    // Monthly or default
    expiryDate.setDate(expiryDate.getDate() + 30);
  }

  // 5. Insert Restaurant
  const { data: restaurant, error: restError } = await adminClient
    .from("restaurants")
    .insert({
      name: input.name,
      slug: input.slug,
      currency: input.currency || "INR",
      gst_number: input.gstNumber || null,
      fssai_license: input.fssaiLicense || null,
      is_active: true,
    })
    .select()
    .single();

  if (restError || !restaurant) {
    throw new BadRequestError(`Failed to create restaurant: ${restError?.message}`);
  }

  // 6. Create branding with custom table limit encoding
  await adminClient.from("restaurant_branding").insert({
    restaurant_id: restaurant.id,
    primary_color: "#783F24",
    logo_url: input.logoUrl || null,
    tagline: `[TABLE_LIMIT:${tableLimit}] Welcome to ${restaurant.name}`,
    support_email: input.contactEmail || ownerEmail || null,
    support_phone: input.contactPhone || ownerPhone || null,
  });

  // 7. Attach subscription record
  if (selectedPlan) {
    await adminClient.from("restaurant_subscriptions").insert({
      restaurant_id: restaurant.id,
      plan_id: selectedPlan.id,
      status: "ACTIVE",
      current_period_start: startDate.toISOString(),
      current_period_end: expiryDate.toISOString(),
    });
  }

  // 8. Assign Owner if ownerId is resolved
  if (resolvedOwnerId) {
    await adminClient.from("restaurant_users").insert({
      restaurant_id: restaurant.id,
      user_id: resolvedOwnerId,
      role: "OWNER",
      is_active: true,
    });
  }

  return {
    ...restaurant,
    tableLimit,
    subscription: selectedPlan
      ? {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          planCode: selectedPlan.code,
          pricePaise: selectedPlan.price_paise,
          startDate: startDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          status: "ACTIVE",
        }
      : null,
    owner: ownerEmail
      ? {
          id: resolvedOwnerId,
          email: ownerEmail,
          fullName: ownerName,
          phone: ownerPhone,
        }
      : null,
    loginUrl: "/login",
  };
}

export async function updateRestaurant(
  restaurantId: string,
  input: UpdateRestaurantInput
) {
  const adminClient = createAdminClient();

  const updateData: {
    name?: string;
    slug?: string;
    currency?: string;
    gst_number?: string | null;
    fssai_license?: string | null;
    is_active?: boolean;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if ((input as any).slug !== undefined) updateData.slug = (input as any).slug;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.gstNumber !== undefined) updateData.gst_number = input.gstNumber;
  if (input.fssaiLicense !== undefined) updateData.fssai_license = input.fssaiLicense;
  if (input.isActive !== undefined) {
    updateData.is_active = input.isActive;
  } else if ((input as any).is_active !== undefined) {
    updateData.is_active = (input as any).is_active;
  }

  const { data, error } = await adminClient
    .from("restaurants")
    .update(updateData)
    .eq("id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Restaurant not found or update failed");
  }

  // Update branding if logo or contact details provided
  const brandingUpdates: Record<string, unknown> = {};
  if ((input as any).logoUrl !== undefined) brandingUpdates.logo_url = (input as any).logoUrl;
  if ((input as any).contactEmail !== undefined) brandingUpdates.support_email = (input as any).contactEmail;
  if ((input as any).contactPhone !== undefined) brandingUpdates.support_phone = (input as any).contactPhone;
  if ((input as any).address !== undefined) {
    const { data: existingBranding } = await adminClient
      .from("restaurant_branding")
      .select("tagline")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    const tableLimitTag = existingBranding?.tagline?.match(/\[TABLE_LIMIT:\d+\]/)?.[0];
    const newAddress = (input as any).address || "";
    brandingUpdates.tagline = tableLimitTag ? `${tableLimitTag} ${newAddress}`.trim() : newAddress;
  }

  if (Object.keys(brandingUpdates).length > 0) {
    brandingUpdates.updated_at = new Date().toISOString();
    brandingUpdates.restaurant_id = restaurantId;
    await adminClient
      .from("restaurant_branding")
      .upsert(brandingUpdates as any, { onConflict: "restaurant_id" });
  }

  return data;
}

export async function getRestaurantById(restaurantId: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("restaurants")
    .select(`
      *,
      restaurant_branding (*),
      restaurant_subscriptions (
        status,
        current_period_start,
        current_period_end,
        subscription_plans (*)
      )
    `)
    .eq("id", restaurantId)
    .single();

  if (error || !data) {
    throw new NotFoundError("Restaurant not found");
  }

  const tableLimit = await getRestaurantTableLimit(restaurantId);

  return {
    ...data,
    tableLimit,
  };
}

export async function getRestaurantBySlug(slug: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      currency,
      is_active,
      restaurant_branding (*)
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new NotFoundError(`Restaurant '${slug}' not found`);
  }

  return data;
}

export async function listRestaurants(options: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) {
  const adminClient = createAdminClient();
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = adminClient
    .from("restaurants")
    .select(
      `
      *,
      restaurant_branding (
        logo_url,
        tagline,
        support_email,
        support_phone
      ),
      restaurant_subscriptions (
        status,
        current_period_start,
        current_period_end,
        subscription_plans (name, code, max_tables, price_paise, billing_period)
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (typeof options.isActive === "boolean") {
    query = query.eq("is_active", options.isActive);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new BadRequestError(`Failed to fetch restaurants: ${error.message}`);
  }

  const mapped = (data || []).map((r: any) => {
    let tableLimit = r.max_tables;
    if (tableLimit === undefined || tableLimit === null) {
      const match = r.restaurant_branding?.tagline?.match(/\[TABLE_LIMIT:(\d+)\]/);
      if (match) {
        tableLimit = parseInt(match[1], 10);
      } else {
        tableLimit = r.restaurant_subscriptions?.[0]?.subscription_plans?.max_tables || 10;
      }
    }
    return {
      ...r,
      tableLimit,
    };
  });

  return {
    restaurants: mapped,
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    },
  };
}

export async function updateBranding(
  restaurantId: string,
  input: UpdateBrandingInput
) {
  const adminClient = createAdminClient();

  if (input.name) {
    await adminClient
      .from("restaurants")
      .update({ name: input.name, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);
  }

  // Preserve table limit tag if present in existing tagline
  const { data: existingBranding } = await adminClient
    .from("restaurant_branding")
    .select("tagline")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const tableLimitTag = existingBranding?.tagline?.match(/\[TABLE_LIMIT:\d+\]/)?.[0];
  let finalTagline = input.tagline ?? (input as any).address ?? null;
  if (tableLimitTag) {
    if (finalTagline) {
      finalTagline = `${tableLimitTag} ${finalTagline.replace(/\[TABLE_LIMIT:\d+\]\s*/, "")}`.trim();
    } else {
      finalTagline = tableLimitTag;
    }
  }

  const { data, error } = await adminClient
    .from("restaurant_branding")
    .upsert({
      restaurant_id: restaurantId,
      logo_url: input.logoUrl ?? null,
      banner_url: input.bannerUrl ?? null,
      primary_color: input.primaryColor || "#783F24",
      tagline: finalTagline,
      support_phone: input.supportPhone ?? (input as any).phone ?? null,
      support_email: input.supportEmail ?? (input as any).email ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to update branding: ${error?.message}`);
  }

  return data;
}

export async function getRestaurantTableLimit(restaurantId: string): Promise<number> {
  const adminClient = createAdminClient();
  const { data: rest } = await adminClient
    .from("restaurants")
    .select("*, restaurant_branding(*)")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!rest) return 10;

  // 1. Direct column if present
  if ((rest as any).max_tables !== undefined && (rest as any).max_tables !== null) {
    return Number((rest as any).max_tables);
  }

  // 2. Branding metadata tag [TABLE_LIMIT:X]
  const branding = (rest as any)?.restaurant_branding;
  if (branding?.tagline) {
    const match = branding.tagline.match(/\[TABLE_LIMIT:(\d+)\]/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  // 3. Subscription fallback
  const { data: sub } = await adminClient
    .from("restaurant_subscriptions")
    .select("subscription_plans (max_tables)")
    .eq("restaurant_id", restaurantId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const plan = (sub as unknown as { subscription_plans: { max_tables: number } | null })?.subscription_plans;
  return plan?.max_tables ?? 10;
}

export async function updateRestaurantTableLimit(
  restaurantId: string,
  maxTables: number
): Promise<{ restaurantId: string; maxTables: number }> {
  const adminClient = createAdminClient();

  // Try update on restaurants table
  await adminClient
    .from("restaurants")
    .update({ max_tables: maxTables } as any)
    .eq("id", restaurantId);

  // Preserve in restaurant_branding tagline
  const { data: branding } = await adminClient
    .from("restaurant_branding")
    .select("tagline")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  let cleanTagline = branding?.tagline ? branding.tagline.replace(/\[TABLE_LIMIT:\d+\]\s*/g, "") : "";
  const newTagline = `[TABLE_LIMIT:${maxTables}] ${cleanTagline}`.trim();

  await adminClient
    .from("restaurant_branding")
    .upsert({
      restaurant_id: restaurantId,
      tagline: newTagline,
      updated_at: new Date().toISOString(),
    });

  return { restaurantId, maxTables };
}

export async function updateRestaurantSubscription(
  restaurantId: string,
  planCode: string,
  extendMonths = 1
) {
  const adminClient = createAdminClient();

  const { data: plan, error: planErr } = await adminClient
    .from("subscription_plans")
    .select("id, code, name, price_paise, billing_period")
    .eq("code", planCode.toUpperCase())
    .single();

  if (planErr || !plan) {
    throw new NotFoundError(`Subscription plan '${planCode}' not found`);
  }

  const now = new Date();
  const startDate = new Date(now);
  const expiryDate = new Date(now);

  const monthsToAdd = extendMonths || (planCode === "ANNUAL" ? 12 : planCode === "SIX_MONTH" ? 6 : 1);
  expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);

  const { data: sub, error: subErr } = await adminClient
    .from("restaurant_subscriptions")
    .upsert({
      restaurant_id: restaurantId,
      plan_id: plan.id,
      status: "ACTIVE",
      current_period_start: startDate.toISOString(),
      current_period_end: expiryDate.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "restaurant_id" })
    .select()
    .single();

  if (subErr || !sub) {
    throw new BadRequestError(`Failed to update subscription: ${subErr?.message}`);
  }

  return {
    ...sub,
    plan,
  };
}

export async function checkTableLimit(restaurantId: string): Promise<{
  currentTables: number;
  maxTables: number;
  allowed: boolean;
}> {
  const adminClient = createAdminClient();
  const maxTables = await getRestaurantTableLimit(restaurantId);

  const { count } = await adminClient
    .from("restaurant_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  const currentTables = count || 0;

  return {
    currentTables,
    maxTables,
    allowed: currentTables < maxTables,
  };
}

/**
 * Permanently deletes a restaurant and all associated resources:
 * Orders, Order items, Inventory, Menu items & categories, Tables & QR tokens,
 * Charges & Taxes, Subscriptions, Memberships, Branding, and Audit logs.
 */
export async function deleteRestaurant(
  restaurantId: string
): Promise<{ success: boolean; message: string }> {
  const adminClient = createAdminClient();

  // 1. Verify restaurant exists
  const { data: restaurant, error: fetchErr } = await adminClient
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", restaurantId)
    .single();

  if (fetchErr || !restaurant) {
    throw new NotFoundError("Restaurant not found");
  }

  // 2. Cascade delete all child data in proper dependency order to avoid foreign key restrict errors
  // A. Orders, items, idempotency keys
  try {
    const { data: orders } = await adminClient
      .from("orders")
      .select("id")
      .eq("restaurant_id", restaurantId);

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      await adminClient.from("order_items").delete().in("order_id", orderIds);
      await adminClient.from("order_idempotency_keys").delete().eq("restaurant_id", restaurantId);
      await adminClient.from("orders").delete().eq("restaurant_id", restaurantId);
    }
  } catch (err) {
    console.warn("Order tables deletion warning:", err);
  }

  // B. Inventory movements, recipe ingredients, inventory items
  try {
    await adminClient.from("inventory_stock_movements").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("recipe_ingredients").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("inventory_items").delete().eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Inventory tables deletion warning:", err);
  }

  // C. Menu item variants, menu items, menu categories
  try {
    await adminClient.from("menu_item_variants").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("menu_items").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("menu_categories").delete().eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Menu tables deletion warning:", err);
  }

  // D. QR tokens and Restaurant tables
  try {
    await adminClient.from("qr_tokens").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("restaurant_tables").delete().eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Table tables deletion warning:", err);
  }

  // E. Charges & Taxes
  try {
    await adminClient.from("restaurant_charges").delete().eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Charges deletion warning:", err);
  }

  // F. Subscriptions, Invitations, Memberships
  try {
    await adminClient.from("restaurant_subscriptions").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("invitations").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("user_restaurant_memberships").delete().eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Memberships deletion warning:", err);
  }

  // G. Branding & Audit logs
  try {
    await adminClient.from("restaurant_branding").delete().eq("restaurant_id", restaurantId);
    await adminClient.from("audit_logs").delete().eq("restaurant_id", restaurantId);
  } catch (err) {
    console.warn("Branding/Audit logs deletion warning:", err);
  }

  // 3. Delete restaurant itself
  const { error: deleteErr } = await adminClient
    .from("restaurants")
    .delete()
    .eq("id", restaurantId);

  if (deleteErr) {
    throw new BadRequestError(`Failed to delete restaurant: ${deleteErr.message}`);
  }

  return {
    success: true,
    message: `Restaurant '${restaurant.name}' and all associated data deleted successfully`,
  };
}
