import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { toggleTableLock } from "@/services/table.service";
import { toggleLockSchema } from "@/lib/validations/table.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id, tableId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = toggleLockSchema.parse(body);

    const updated = await toggleTableLock(id, tableId, validated.isLocked);
    return successResponse(updated, {
      message: `Table ${validated.isLocked ? "locked" : "unlocked"} successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

