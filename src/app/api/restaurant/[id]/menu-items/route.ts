import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getMenuItems, createMenuItem } from "@/services/menu.service";
import { menuItemSchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const isAvailable = searchParams.has("isAvailable")
      ? searchParams.get("isAvailable") === "true"
      : undefined;
    const isVeg = searchParams.has("isVeg")
      ? searchParams.get("isVeg") === "true"
      : undefined;
    const search = searchParams.get("search") || undefined;

    const items = await getMenuItems(id, {
      categoryId,
      isAvailable,
      isVeg,
      search,
    });

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

    const json = await request.json();
    const validated = menuItemSchema.parse(json);

    const item = await createMenuItem(id, validated);
    return successResponse(item, {
      message: "Menu item created successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
