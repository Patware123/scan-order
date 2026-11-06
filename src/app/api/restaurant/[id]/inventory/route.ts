import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  getInventoryItems,
  createInventoryItem,
} from "@/services/inventory.service";
import { inventoryItemSchema } from "@/lib/validations/inventory.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const items = await getInventoryItems(id);
    return successResponse(items);
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
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = inventoryItemSchema.parse(body);

    const created = await createInventoryItem(id, validated);
    return successResponse(created, {
      message: "Inventory item created successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

