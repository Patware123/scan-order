import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { acceptInvitation } from "@/services/invitation.service";
import { acceptInvitationSchema } from "@/lib/validations/invitation.schema";
import { successResponse } from "@/lib/utils/api-response";
import { handleApiError } from "@/lib/utils/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const json = await request.json();
    const validated = acceptInvitationSchema.parse(json);

    const result = await acceptInvitation(validated.token, user.id);
    return successResponse(result, {
      message: "Invitation accepted. You now have access to the restaurant.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
