import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import {
  getRestaurantCharges,
  createRestaurantCharge,
} from "@/services/charges.service";
import { restaurantChargeSchema } from "@/lib/validations/charges.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Allow public menu or staff to view active charges
    const appliesTo = request.nextUrl.searchParams.get("appliesTo") as "ALL" | "DINE_IN" | "PARCEL" | null;
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

    const charges = await getRestaurantCharges(id, {
      activeOnly: !includeInactive,
      appliesTo: appliesTo || undefined,
    });

    return successResponse(charges);
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
    const validated = restaurantChargeSchema.parse(body);

    const charge = await createRestaurantCharge(id, validated);
    return successResponse(charge, {
      message: "Charge created successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

