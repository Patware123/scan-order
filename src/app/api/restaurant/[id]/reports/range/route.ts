import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { getReportsRange } from "@/services/reports.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError, BadRequestError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      throw new BadRequestError("Both startDate and endDate query parameters are required");
    }

    const rangeData = await getReportsRange(id, startDate, endDate);
    return successResponse(rangeData);
  } catch (error) {
    return handleApiError(error);
  }
}
