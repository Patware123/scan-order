import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getOrderById, deleteOrArchiveOrder } from "@/services/order.service";
import { deleteOrderSchema } from "@/lib/validations/order.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const { id, orderId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const order = await getOrderById(id, orderId);
    return successResponse(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  try {
    const { id, orderId } = await params;
    // Owner can delete; Manager permitted if authorized
    const { user, membership } = await requireRestaurantRole(
      id,
      ["OWNER", "MANAGER"],
      request
    );

    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = deleteOrderSchema.safeParse(body);
      if (parsed.success) reason = parsed.data.reason;
    } catch {
      // Body is optional on DELETE
    }

    const result = await deleteOrArchiveOrder(
      id,
      orderId,
      user.id,
      membership.role,
      reason
    );

    return successResponse(result, {
      message: "Order deleted/archived and table released successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
