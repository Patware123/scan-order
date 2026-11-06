import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  getRestaurantTaxConfig,
  updateRestaurantTaxConfig,
} from "@/services/charges.service";
import { taxConfigSchema } from "@/lib/validations/charges.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER", "KITCHEN"], request);

    const config = await getRestaurantTaxConfig(id);
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = taxConfigSchema.parse(json);

    const updated = await updateRestaurantTaxConfig(id, validated);
    return successResponse(updated, {
      message: "Tax configuration updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
