import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types/database.types";
import { BadRequestError, NotFoundError, ConflictError } from "@/lib/utils/errors";
import crypto from "crypto";

export async function createInvitation(
  restaurantId: string,
  email: string,
  role: UserRole,
  invitedByUserId?: string
) {
  const adminClient = createAdminClient();

  // Check if invitation already pending
  const { data: existing } = await adminClient
    .from("restaurant_invitations")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("email", email.toLowerCase())
    .eq("status", "PENDING")
    .maybeSingle();

  if (existing) {
    throw new ConflictError("A pending invitation already exists for this email address");
  }

  const token = crypto.randomBytes(24).toString("hex");

  const { data, error } = await adminClient
    .from("restaurant_invitations")
    .insert({
      restaurant_id: restaurantId,
      email: email.toLowerCase(),
      role,
      token,
      invited_by: invitedByUserId || null,
      status: "PENDING",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to create invitation: ${error?.message}`);
  }

  return data;
}

export async function listInvitations(restaurantId: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("restaurant_invitations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new BadRequestError(`Failed to fetch invitations: ${error.message}`);
  }

  return data || [];
}

export async function acceptInvitation(token: string, userId: string) {
  const adminClient = createAdminClient();

  // 1. Fetch invitation
  const { data: invite, error } = await adminClient
    .from("restaurant_invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "PENDING")
    .single();

  if (error || !invite) {
    throw new NotFoundError("Invalid or expired invitation token");
  }

  if (new Date(invite.expires_at) < new Date()) {
    await adminClient
      .from("restaurant_invitations")
      .update({ status: "EXPIRED" })
      .eq("id", invite.id);
    throw new BadRequestError("This invitation has expired");
  }

  // 2. Add or activate membership in restaurant_users
  const { error: userError } = await adminClient
    .from("restaurant_users")
    .upsert({
      restaurant_id: invite.restaurant_id,
      user_id: userId,
      role: invite.role as UserRole,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (userError) {
    throw new BadRequestError(`Failed to attach user to restaurant: ${userError.message}`);
  }

  // 3. Mark invitation accepted
  await adminClient
    .from("restaurant_invitations")
    .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
    .eq("id", invite.id);

  return {
    success: true,
    restaurantId: invite.restaurant_id,
    role: invite.role,
  };
}

export async function revokeInvitation(restaurantId: string, invitationId: string) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("restaurant_invitations")
    .update({ status: "REVOKED", updated_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to revoke invitation: ${error.message}`);
  }

  return { success: true };
}
