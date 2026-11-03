import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/rbac";
import { listRestaurants, createRestaurant } from "@/services/restaurant.service";
import { createRestaurantSchema, createRestaurantOnboardingSchema } from "@/lib/validations/restaurant.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== null ? isActiveParam === "true" : undefined;

    const result = await listRestaurants({ page, limit, isActive });

    return successResponse(result.restaurants, {
      meta: result.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin(request);
    const json = await request.json();

    let validated: any;
    if (
      json.ownerPassword ||
      json.owner_password ||
      json.planCode ||
      json.plan_code ||
      json.maxTables ||
      json.max_tables ||
      json.contactEmail ||
      json.contact_email
    ) {
      validated = createRestaurantOnboardingSchema.parse(json);
    } else {
      validated = createRestaurantSchema.parse(json);
    }

    const restaurant = await createRestaurant(validated, user.id);

    return successResponse(restaurant, {
      message: "Restaurant onboarded successfully with owner credentials and plan configuration",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
