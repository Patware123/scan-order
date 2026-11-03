import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getRestaurantOrders } from "@/services/order.service";
import { orderQuerySchema } from "@/lib/validations/order.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get("status") || undefined,
      tableId: searchParams.get("tableId") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      updatedAfter: searchParams.get("updatedAfter") || undefined,
    };

    const validated = orderQuerySchema.parse(queryParams);
    const result = await getRestaurantOrders(id, validated);

    return successResponse(result.orders, {
      meta: result.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
