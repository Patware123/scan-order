import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  updateRestaurantCharge,
  deleteRestaurantCharge,
} from "@/services/charges.service";
import { updateRestaurantChargeSchema } from "@/lib/validations/charges.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  try {
    const { id, chargeId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = updateRestaurantChargeSchema.parse(body);

    const updated = await updateRestaurantCharge(id, chargeId, validated);
    return successResponse(updated, {
      message: "Charge updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  try {
    const { id, chargeId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await deleteRestaurantCharge(id, chargeId);
    return successResponse({ success: true }, {
      message: "Charge deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

