import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getRestaurantStaff, createRestaurantStaff } from "@/services/staff.service";
import { createStaffSchema } from "@/lib/validations/staff.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const staffList = await getRestaurantStaff(id);
    return successResponse(staffList);
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
    await requireRestaurantRole(id, ["OWNER"], request);

    const json = await request.json();
    const validated = createStaffSchema.parse(json);

    const newStaff = await createRestaurantStaff(id, validated);

    return successResponse(newStaff, {
      status: 201,
      message: `${validated.role === "KITCHEN" ? "Kitchen staff" : "Manager"} account created successfully`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
