import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { updateTableLimitSchema } from "@/lib/validations/restaurant.schema";
import { updateRestaurantTableLimit } from "@/services/restaurant.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const json = await request.json();
    const validated = updateTableLimitSchema.parse(json);

    const result = await updateRestaurantTableLimit(id, validated.maxTables);

    return successResponse(result, {
      message: `Table limit updated to ${validated.maxTables} tables successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
