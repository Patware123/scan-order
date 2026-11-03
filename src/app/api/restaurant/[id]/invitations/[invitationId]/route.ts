import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { revokeInvitation } from "@/services/invitation.service";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invitationId: string }> }
) {
  try {
    const { id, invitationId } = await params;
    await requireRestaurantRole(id, ["OWNER"], request);

    await revokeInvitation(id, invitationId);
    return successResponse({ success: true }, { message: "Invitation revoked" });
  } catch (error) {
    return handleApiError(error);
  }
}
