import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { updateSubscriptionSchema } from "@/lib/validations/restaurant.schema";
import { updateRestaurantSubscription } from "@/services/restaurant.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;
    const json = await request.json();
    const validated = updateSubscriptionSchema.parse(json);

    const result = await updateRestaurantSubscription(
      id,
      validated.planCode,
      validated.extendMonths
    );

    return successResponse(result, {
      message: `Subscription plan updated to ${validated.planCode} successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
