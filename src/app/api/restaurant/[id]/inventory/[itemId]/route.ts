import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  updateInventoryItem,
  deleteInventoryItem,
} from "@/services/inventory.service";
import { updateInventoryItemSchema } from "@/lib/validations/inventory.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = updateInventoryItemSchema.parse(body);

    const updated = await updateInventoryItem(id, itemId, validated);
    return successResponse(updated, {
      message: "Inventory item updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await deleteInventoryItem(id, itemId);
    return successResponse({ success: true }, {
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

