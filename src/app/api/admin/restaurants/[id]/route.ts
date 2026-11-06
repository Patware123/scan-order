import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import {
  updateRestaurant,
  getRestaurantById,
  deleteRestaurant,
} from "@/services/restaurant.service";
import { updateRestaurantSchema } from "@/lib/validations/restaurant.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const restaurant = await getRestaurantById(id);

    return successResponse(restaurant);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const json = await request.json();
    const validated = updateRestaurantSchema.parse(json);

    const updated = await updateRestaurant(id, validated);

    return successResponse(updated, {
      message: "Restaurant updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const result = await deleteRestaurant(id);
    return successResponse(result, {
      message: "Restaurant and all associated data deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
