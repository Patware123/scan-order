import { NextRequest } from "next/server";
import { resolveTableFromToken } from "@/lib/auth/rbac";
import { getCategories, getMenuItems } from "@/services/menu.service";
import { getRestaurantById } from "@/services/restaurant.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;
    const tableInfo = await resolveTableFromToken(tableToken);

    const [restaurant, categories, items] = await Promise.all([
      getRestaurantById(tableInfo.restaurantId),
      getCategories(tableInfo.restaurantId, false),
      getMenuItems(tableInfo.restaurantId, { isAvailable: true }),
    ]);

    return successResponse({
      table: {
        id: tableInfo.tableId,
        tableNumber: tableInfo.tableNumber,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        currency: restaurant.currency,
        branding: restaurant.restaurant_branding,
      },
      categories,
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
