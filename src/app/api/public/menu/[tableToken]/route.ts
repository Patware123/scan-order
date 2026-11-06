import { NextRequest } from "next/server";
import { resolveTableFromToken } from "@/lib/auth/rbac";
import { getCategories, getMenuItems } from "@/services/menu.service";
import { getRestaurantById } from "@/services/restaurant.service";
import { getRestaurantCharges } from "@/services/charges.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  try {
    const { tableToken } = await params;
    const tableInfo = await resolveTableFromToken(tableToken);

    const [restaurant, categories, items, charges] = await Promise.all([
      getRestaurantById(tableInfo.restaurantId),
      getCategories(tableInfo.restaurantId, false),
      getMenuItems(tableInfo.restaurantId, { isAvailable: true }),
      getRestaurantCharges(tableInfo.restaurantId, { activeOnly: true, appliesTo: "DINE_IN" }),
    ]);

    return successResponse({
      table: {
        id: tableInfo.tableId,
        tableNumber: tableInfo.tableNumber,
        isScannerActive: tableInfo.isScannerActive ?? true,
        isLocked: tableInfo.isLocked ?? false,
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
      charges: charges || [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
