import { NextRequest } from "next/server";
import { requireRestaurantRole } from "@/lib/auth/rbac";
import { listInvitations, createInvitation } from "@/services/invitation.service";
import { createInvitationSchema } from "@/lib/validations/invitation.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const invites = await listInvitations(id);
    return successResponse(invites);
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
    const { user } = await requireRestaurantRole(id, ["OWNER", "MANAGER"], request);

    const json = await request.json();
    const validated = createInvitationSchema.parse(json);

    const invitation = await createInvitation(id, validated.email, validated.role, user.id);
    return successResponse(invitation, {
      message: "Invitation generated successfully",
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
