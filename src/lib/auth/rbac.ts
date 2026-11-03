import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types/database.types";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/utils/errors";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  isSuperAdmin?: boolean;
}

export interface UserRestaurantMembership {
  id: string;
  userId: string;
  restaurantId: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Extracts and verifies the authenticated user from the current request.
 * Throws UnauthorizedError if not logged in.
 */
export async function requireAuth(request?: NextRequest): Promise<AuthenticatedUser> {
  // Check authorization header first if provided (for API tokens / mobile / external clients)
  const authHeader = request?.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedError("Invalid or expired authorization token");
    }
    return {
      id: data.user.id,
      email: data.user.email,
    };
  }

  // Fallback to cookie-based session
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError("You must be signed in to perform this action");
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Verifies that the authenticated user belongs to the specified restaurant
 * and has one of the required roles.
 *
 * CRITICAL TENANT ISOLATION:
 * Never trust a restaurant_id without calling this function!
 */
export async function requireRestaurantRole(
  restaurantId: string,
  allowedRoles: UserRole[],
  request?: NextRequest
): Promise<{ user: AuthenticatedUser; membership: UserRestaurantMembership }> {
  const user = await requireAuth(request);
  const adminClient = createAdminClient();

  // Check if user is platform Super Admin (bypass single-tenant check)
  const isSuperAdmin = await checkIsSuperAdmin(user.id);
  if (isSuperAdmin) {
    return {
      user: { ...user, isSuperAdmin: true },
      membership: {
        id: "super-admin-bypass",
        userId: user.id,
        restaurantId,
        role: "SUPER_ADMIN",
        isActive: true,
      },
    };
  }

  const { data: membership, error } = await adminClient
    .from("restaurant_users")
    .select("id, user_id, restaurant_id, role, is_active")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !membership) {
    throw new ForbiddenError("You do not have access to this restaurant");
  }

  if (!allowedRoles.includes(membership.role as UserRole)) {
    throw new ForbiddenError(
      `Insufficient permissions. Required role: ${allowedRoles.join(" or ")}`
    );
  }

  return {
    user,
    membership: {
      id: membership.id,
      userId: membership.user_id,
      restaurantId: membership.restaurant_id,
      role: membership.role as UserRole,
      isActive: membership.is_active,
    },
  };
}

/**
 * Checks if a user has platform-level Super Admin privileges.
 */
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("restaurant_users")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "SUPER_ADMIN")
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data);
}

/**
 * Enforces Super Admin access for platform-wide operations.
 */
export async function requireSuperAdmin(request?: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  const isSuperAdmin = await checkIsSuperAdmin(user.id);

  if (!isSuperAdmin) {
    throw new ForbiddenError("Super Admin privileges required");
  }

  return { ...user, isSuperAdmin: true };
}

/**
 * Resolves a table QR token into its restaurant and table entity.
 * Public guests use this to browse menus and place orders.
 */
export async function resolveTableFromToken(token: string): Promise<{
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  restaurantName: string;
  restaurantSlug: string;
  currency: string;
}> {
  const adminClient = createAdminClient();

  const { data: qrToken, error } = await adminClient
    .from("table_qr_tokens")
    .select(`
      restaurant_id,
      table_id,
      is_revoked,
      restaurant_tables!inner (
        id,
        table_number,
        is_active,
        restaurants!inner (
          id,
          name,
          slug,
          currency,
          is_active
        )
      )
    `)
    .eq("token", token)
    .eq("is_revoked", false)
    .single();

  if (error || !qrToken) {
    throw new NotFoundError("Invalid or expired QR code");
  }

  const table = qrToken.restaurant_tables as unknown as {
    id: string;
    table_number: string;
    is_active: boolean;
    restaurants: {
      id: string;
      name: string;
      slug: string;
      currency: string;
      is_active: boolean;
    };
  };

  if (!table.is_active) {
    throw new ForbiddenError("This table is currently inactive");
  }

  if (!table.restaurants.is_active) {
    throw new ForbiddenError("This restaurant is currently closed or inactive");
  }

  return {
    restaurantId: qrToken.restaurant_id,
    tableId: qrToken.table_id,
    tableNumber: table.table_number,
    restaurantName: table.restaurants.name,
    restaurantSlug: table.restaurants.slug,
    currency: table.restaurants.currency,
  };
}
