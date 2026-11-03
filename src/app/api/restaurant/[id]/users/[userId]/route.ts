import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updateRestaurantStaffStatus } from "@/services/staff.service";
import { updateStaffStatusSchema } from "@/lib/validations/staff.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    await requireRestaurantRole(id, ["OWNER"], request);

    const json = await request.json();
    const validated = updateStaffStatusSchema.parse(json);

    const updated = await updateRestaurantStaffStatus(id, userId, validated.isActive);

    return successResponse(updated, {
      message: `Staff member has been ${validated.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
