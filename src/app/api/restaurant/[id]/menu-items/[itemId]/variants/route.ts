import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  getMenuItemVariants,
  createMenuItemVariant,
} from "@/services/menu.service";
import { menuItemVariantSchema } from "@/lib/validations/menu.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const variants = await getMenuItemVariants(id, itemId);
    return successResponse(variants);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const body = await request.json();
    const validated = menuItemVariantSchema.parse(body);

    const variant = await createMenuItemVariant(id, itemId, validated);
    return successResponse(variant, {
      message: "Variant created successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

