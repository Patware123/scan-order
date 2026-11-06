import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  updateMenuItemVariant,
  deleteMenuItemVariant,
} from "@/services/menu.service";
import { updateMenuItemVariantSchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = updateMenuItemVariantSchema.parse(body);

    const updated = await updateMenuItemVariant(id, variantId, validated);
    return successResponse(updated, {
      message: "Variant updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; variantId: string }> }
) {
  try {
    const { id, variantId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await deleteMenuItemVariant(id, variantId);
    return successResponse({ success: true }, {
      message: "Variant deleted successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

