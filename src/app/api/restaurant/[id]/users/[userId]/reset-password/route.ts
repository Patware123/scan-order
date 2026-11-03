import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { resetRestaurantStaffPassword } from "@/services/staff.service";
import { resetStaffPasswordSchema } from "@/lib/validations/staff.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    await requireRestaurantRole(id, ["OWNER"], request);

    const json = await request.json();
    const validated = resetStaffPasswordSchema.parse(json);

    const result = await resetRestaurantStaffPassword(id, userId, validated.newPassword);

    return successResponse(result, {
      message: "Staff password reset successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
