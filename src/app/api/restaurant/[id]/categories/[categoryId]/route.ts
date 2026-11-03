import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { updateCategory, deleteCategory } from "@/services/menu.service";
import { updateCategorySchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id, categoryId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = updateCategorySchema.parse(json);

    const updated = await updateCategory(id, categoryId, validated);
    return successResponse(updated, { message: "Category updated" });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id, categoryId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await deleteCategory(id, categoryId);
    return successResponse({ success: true }, { message: "Category deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
