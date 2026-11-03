import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updateBranding } from "@/services/restaurant.service";
import { updateBrandingSchema } from "@/lib/validations/restaurant.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

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
