import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { deleteRecipeIngredient } from "@/services/inventory.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const { id, ingredientId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await deleteRecipeIngredient(id, ingredientId);
    return successResponse({ success: true }, {
      message: "Recipe ingredient mapping removed",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

