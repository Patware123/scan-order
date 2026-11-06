import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getInventoryMovements } from "@/services/inventory.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const itemId = request.nextUrl.searchParams.get("itemId") || undefined;
    const movements = await getInventoryMovements(id, itemId);
    return successResponse(movements);
  } catch (error) {
    return handleApiError(error);
  }
}

