import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  getMenuItemIngredients,
  mapRecipeIngredient,
} from "@/services/inventory.service";
import { recipeIngredientSchema } from "@/lib/validations/inventory.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const menuItemId = request.nextUrl.searchParams.get("menuItemId") || undefined;
    const ingredients = await getMenuItemIngredients(id, menuItemId);
    return successResponse(ingredients);
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
    const validated = recipeIngredientSchema.parse(body);

    const mapped = await mapRecipeIngredient(id, validated);
    return successResponse(mapped, {
      message: "Recipe ingredient mapped successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

