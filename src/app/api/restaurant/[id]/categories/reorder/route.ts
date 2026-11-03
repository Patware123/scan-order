import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { reorderCategories } from "@/services/menu.service";
import { reorderItemsSchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = reorderItemsSchema.parse(json);

    await reorderCategories(id, validated.items);
    return successResponse({ success: true }, { message: "Categories reordered successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
