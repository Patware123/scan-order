import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getRestaurantOrders, createStaffOrder } from "@/services/order.service";
import {
  orderQuerySchema,
  createStaffOrderSchema,
} from "@/lib/validations/order.schema";
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
      orderType: searchParams.get("orderType") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
      updatedAfter: searchParams.get("updatedAfter") || undefined,
      includeArchived: searchParams.get("includeArchived") === "true",
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, membership } = await requireRestaurantRole(
      id,
      ["OWNER", "MANAGER"],
      request
    );

    const body = await request.json();
    const validated = createStaffOrderSchema.parse(body);

    const created = await createStaffOrder(
      id,
      user.id,
      membership.role,
      validated
    );

    return successResponse(created.order, {
      message: `${validated.orderType === "PARCEL" ? "Parcel" : "Table"} order created successfully`,
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
