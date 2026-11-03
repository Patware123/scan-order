import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { revokeQrToken } from "@/services/table.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id, tableId } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    await revokeQrToken(id, tableId);
    return successResponse({ success: true }, { message: "QR token revoked" });
  } catch (error) {
    return handleApiError(error);
  }
}
