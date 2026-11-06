import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { toggleMenuItemAvailability } from "@/services/menu.service";
import { toggleAvailabilitySchema } from "@/lib/validations/menu.schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    let isAvailable: boolean | undefined = undefined;
    try {
      const text = await request.text();
      if (text && text.trim().length > 0) {
        const json = JSON.parse(text);
        const validated = toggleAvailabilitySchema.parse(json);
        isAvailable = validated.isAvailable;
      }
    } catch {
      // Fallback if empty or invalid body
    }

    if (isAvailable === undefined) {
      const adminClient = createAdminClient();
      const { data: item } = await adminClient
        .from("menu_items")
        .select("is_available")
        .eq("id", itemId)
        .eq("restaurant_id", id)
        .single();
      isAvailable = item ? !item.is_available : true;
    }

    const updated = await toggleMenuItemAvailability(id, itemId, isAvailable);
    return successResponse(updated, {
      message: `Item availability set to ${isAvailable ? "Available" : "Unavailable"}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = PATCH;
export const PUT = PATCH;
