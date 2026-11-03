import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getRestaurantById, updateRestaurant } from "@/services/restaurant.service";
import { updateRestaurantSchema } from "@/lib/validations/restaurant.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

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
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER"], request);

    const json = await request.json();
    const validated = updateRestaurantSchema.parse(json);

    const updated = await updateRestaurant(id, validated);
    return successResponse(updated, { message: "Restaurant details updated" });
  } catch (error) {
    return handleApiError(error);
  }
}
