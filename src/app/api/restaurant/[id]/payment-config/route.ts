import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  getPaymentConfig,
  updatePaymentConfig,
} from "@/services/payment-config.service";
import { updatePaymentConfigSchema } from "@/lib/validations/payment-config.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const config = await getPaymentConfig(id);
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
    const validated = updatePaymentConfigSchema.parse(json);

    const updated = await updatePaymentConfig(id, validated);
    return successResponse(updated, {
      message: "Payment configuration updated successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = PATCH;
export const POST = PATCH;

