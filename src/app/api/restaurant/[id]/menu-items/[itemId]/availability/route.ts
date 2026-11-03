import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { toggleMenuItemAvailability } from "@/services/menu.service";
import { toggleAvailabilitySchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const json = await request.json();
    const validated = toggleAvailabilitySchema.parse(json);

    const updated = await toggleMenuItemAvailability(id, itemId, validated.isAvailable);
    return successResponse(updated, {
      message: `Item availability set to ${validated.isAvailable ? "Available" : "Unavailable"}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
