import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updatePaymentStatus } from "@/services/order.service";
import { updatePaymentStatusSchema } from "@/lib/validations/order.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const { id, orderId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = updatePaymentStatusSchema.parse(json);

    const updated = await updatePaymentStatus(id, orderId, validated.paymentStatus);
    return successResponse(updated, {
      message: `Payment status updated to ${validated.paymentStatus}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
