import { createAdminClient } from "@/lib/supabase/admin";
import { CreateStaffInput } from "@/lib/validations/staff.schema";
import { NotFoundError, ConflictError, BadRequestError } from "@/lib/utils/errors";
import { UserRole } from "@/types/database.types";

export interface RestaurantStaffMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export async function getRestaurantStaff(restaurantId: string): Promise<RestaurantStaffMember[]> {
  const adminClient = createAdminClient();

  const { data: members, error } = await adminClient
    .from("restaurant_users")
    .select("id, user_id, role, is_active, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new BadRequestError(`Failed to fetch restaurant staff: ${error.message}`);
  }

  if (!members || members.length === 0) {
    return [];
  }

  // Fetch Auth details for each user
  const staffList: RestaurantStaffMember[] = [];
  for (const m of members) {
    const { data: authData } = await adminClient.auth.admin.getUserById(m.user_id);
    const authUser = authData?.user;
    staffList.push({
      id: m.id,
      userId: m.user_id,
      email: authUser?.email || "Unknown Email",
      fullName: (authUser?.user_metadata?.full_name as string) || (authUser?.email?.split("@")[0] || "Staff Member"),
      phone: (authUser?.user_metadata?.phone as string) || null,
      role: m.role as UserRole,
      isActive: m.is_active,
      createdAt: m.created_at,
    });
  }

  return staffList;
}

export async function createRestaurantStaff(
  restaurantId: string,
  input: CreateStaffInput
): Promise<RestaurantStaffMember> {
  const adminClient = createAdminClient();

  // 1. Check if user already exists in Auth
  let userId: string;
  const { data: existingUser } = await adminClient.auth.admin.listUsers();
  const matchedUser = existingUser?.users?.find(
    (u) => u.email?.toLowerCase() === input.email.toLowerCase()
  );

  if (matchedUser) {
    userId = matchedUser.id;
    // Check if already in this restaurant
    const { data: existingMembership } = await adminClient
      .from("restaurant_users")
      .select("id, is_active")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMembership) {
      throw new ConflictError(`User ${input.email} is already a staff member in this restaurant`);
    }

    // Update metadata if needed
    await adminClient.auth.admin.updateUserById(userId, {
      password: input.password,
      user_metadata: {
        ...matchedUser.user_metadata,
        full_name: input.fullName,
        phone: input.phone || matchedUser.user_metadata?.phone,
      },
    });
  } else {
    // 2. Create new Auth user
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone || null,
        initial_role: input.role,
      },
    });

    if (createError || !createData?.user) {
      throw new BadRequestError(`Failed to create authentication user: ${createError?.message}`);
    }

    userId = createData.user.id;
  }

  // 3. Assign role to restaurant
  const { data: membership, error: memberError } = await adminClient
    .from("restaurant_users")
    .insert({
      restaurant_id: restaurantId,
      user_id: userId,
      role: input.role,
      is_active: true,
    })
    .select()
    .single();

  if (memberError || !membership) {
    throw new BadRequestError(`Failed to assign staff role: ${memberError?.message}`);
  }

  return {
    id: membership.id,
    userId,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone || null,
    role: membership.role as UserRole,
    isActive: membership.is_active,
    createdAt: membership.created_at,
  };
}

export async function updateRestaurantStaffStatus(
  restaurantId: string,
  targetUserId: string,
  isActive: boolean
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("restaurant_users")
    .update({ is_active: isActive })
    .eq("restaurant_id", restaurantId)
    .eq("user_id", targetUserId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Staff membership record not found or update failed");
  }

  return data;
}

export async function resetRestaurantStaffPassword(
  restaurantId: string,
  targetUserId: string,
  newPassword: string
) {
  const adminClient = createAdminClient();

  // Verify membership first
  const { data: member, error: memberError } = await adminClient
    .from("restaurant_users")
    .select("id, role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", targetUserId)
    .single();

  if (memberError || !member) {
    throw new NotFoundError("Staff member not found in this restaurant");
  }

  // Update password in Supabase Auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: newPassword,
  });

  if (authError) {
    throw new BadRequestError(`Failed to reset password: ${authError.message}`);
  }

  return { success: true, message: "Staff password has been reset successfully" };
}
