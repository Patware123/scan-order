import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updateBranding, getRestaurantById } from "@/services/restaurant.service";
import { updateBrandingSchema } from "@/lib/validations/restaurant.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const restaurant = await getRestaurantById(id);
    const branding = Array.isArray(restaurant.restaurant_branding)
      ? restaurant.restaurant_branding[0] || {}
      : (restaurant.restaurant_branding as Record<string, any>) || {};

    const cleanAddress = branding.tagline
      ? branding.tagline.replace(/\[TABLE_LIMIT:\d+\]\s*/, "").trim()
      : null;

    return successResponse({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      phone: branding.support_phone || branding.phone || (restaurant as any).phone || null,
      email: branding.support_email || branding.email || (restaurant as any).email || null,
      address: cleanAddress || branding.address || (restaurant as any).address || null,
      currency: restaurant.currency,
      ordering_mode: branding.ordering_mode || (restaurant as any).ordering_mode || "STAFF_SERVED",
      primary_color: branding.primary_color || "#783F24",
      secondary_color: branding.secondary_color || "#FAF8F4",
      logo_url: branding.logo_url || null,
      banner_url: branding.banner_url || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = updateBrandingSchema.parse(json);

    const updated = await updateBranding(id, validated);
    return successResponse(updated, { message: "Branding updated successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = PATCH;
export const POST = PATCH;
