import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updateMenuItem, deleteMenuItem } from "@/services/menu.service";
import { updateMenuItemSchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = updateMenuItemSchema.parse(json);

    const updated = await updateMenuItem(id, itemId, validated);
    return successResponse(updated, { message: "Menu item updated" });
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

    await deleteMenuItem(id, itemId);
    return successResponse({ success: true }, { message: "Menu item deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
