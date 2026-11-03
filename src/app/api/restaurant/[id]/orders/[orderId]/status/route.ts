import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { transitionOrderStatus } from "@/services/order.service";
import { updateOrderStatusSchema } from "@/lib/validations/order.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError, ForbiddenError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const { id, orderId } = await params;
    const { user, membership } = await requireRestaurantRole(
      id,
      ["OWNER", "MANAGER", "KITCHEN"],
      request
    );

    const json = await request.json();
    const validated = updateOrderStatusSchema.parse(json);

    // Kitchen staff can transition to ACCEPTED, PREPARING, READY, or COMPLETED (Dispatched)
    if (membership.role === "KITCHEN") {
      if (!["ACCEPTED", "PREPARING", "READY", "COMPLETED"].includes(validated.status)) {
        throw new ForbiddenError("Kitchen staff may only update status to ACCEPTED, PREPARING, READY, or COMPLETED");
      }
    }

    const updated = await transitionOrderStatus(id, orderId, validated.status, {
      type: "STAFF",
      id: user.id,
      note: validated.note,
    });

    return successResponse(updated, {
      message: `Order transitioned to ${validated.status}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
