import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { generateQrToken } from "@/services/table.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id, tableId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const token = await generateQrToken(id, tableId);
    return successResponse({ token }, { message: "QR token regenerated successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
