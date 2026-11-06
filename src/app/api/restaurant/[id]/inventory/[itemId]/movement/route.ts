import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { recordStockMovement } from "@/services/inventory.service";
import { inventoryMovementSchema } from "@/lib/validations/inventory.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const { user } = await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = inventoryMovementSchema.parse(body);

    const result = await recordStockMovement(id, itemId, validated, user.id);
    return successResponse(result, {
      message: `Stock ${validated.movementType.toLowerCase()} recorded successfully`,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

