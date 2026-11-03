"use client";

import * as React from "react";
import { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/services/api/client";
import { SUPER_ADMIN_EMAILS } from "@/config/constants";

export type UserRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "KITCHEN" | "KITCHEN_STAFF" | null;

export interface RestaurantMembership {
  restaurantId: string;
  name: string;
  slug: string;
  role: "OWNER" | "MANAGER" | "KITCHEN" | "KITCHEN_STAFF";
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  memberships: RestaurantMembership[];
  activeRestaurant: RestaurantMembership | null;
  activeRestaurantId: string | null;
  setActiveRestaurantId: (id: string) => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ role: UserRole; redirectUrl: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<UserRole>(null);
  const [memberships, setMemberships] = React.useState<RestaurantMembership[]>([]);
  const [activeRestaurantId, setActiveRestaurantIdState] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchProfile = React.useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setRole(null);
      setMemberships([]);
      setActiveRestaurantIdState(null);
      setIsLoading(false);
      return;
    }

    setUser(currentUser);

    // 1. Check Super Admin
    if (currentUser.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
      setRole("SUPER_ADMIN");
    }

    // 2. Fetch Restaurant Memberships
    try {
      const { data: userRoles } = await supabaseBrowser
        .from("restaurant_users")
        .select(`
          restaurant_id,
          role,
          restaurants (
            id,
            name,
            slug
          )
        `)
        .eq("user_id", currentUser.id);

      const mapped: RestaurantMembership[] = [];
      if (userRoles && Array.isArray(userRoles)) {
        for (const r of userRoles) {
          const rest = Array.isArray(r.restaurants) ? r.restaurants[0] : r.restaurants;
          if (rest) {
            mapped.push({
              restaurantId: r.restaurant_id,
              name: rest.name,
              slug: rest.slug,
              role: r.role as "OWNER" | "MANAGER" | "KITCHEN" | "KITCHEN_STAFF",
            });
          }
        }
      }

      setMemberships(mapped);

      // Determine Primary Role
      if (currentUser.email && SUPER_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
        setRole("SUPER_ADMIN");
      } else if (mapped.length > 0) {
        setRole(mapped[0].role);
      }

      // Pick Active Restaurant
      const savedId = typeof window !== "undefined" ? localStorage.getItem("scanorder_active_rest_id") : null;
      const validSaved = mapped.find((m) => m.restaurantId === savedId);
      if (validSaved) {
        setActiveRestaurantIdState(validSaved.restaurantId);
      } else if (mapped.length > 0) {
        setActiveRestaurantIdState(mapped[0].restaurantId);
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const setActiveRestaurantId = (id: string) => {
    setActiveRestaurantIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("scanorder_active_rest_id", id);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Login failed, user object not returned");
    }

    // Determine redirect
    const isSuper = data.user.email && SUPER_ADMIN_EMAILS.includes(data.user.email.toLowerCase());
    if (isSuper) {
      return { role: "SUPER_ADMIN" as UserRole, redirectUrl: "/admin" };
    }

    // Check staff role
    const { data: userRoles } = await supabaseBrowser
      .from("restaurant_users")
      .select("role")
      .eq("user_id", data.user.id)
      .limit(1);

    const rawRole = (userRoles?.[0]?.role as string) || "MANAGER";
    const userRole: UserRole =
      rawRole === "KITCHEN" || rawRole === "KITCHEN_STAFF"
        ? "KITCHEN"
        : (rawRole as UserRole);

    if (userRole === "KITCHEN") {
      return { role: "KITCHEN" as UserRole, redirectUrl: "/dashboard/kitchen" };
    }

    return { role: userRole, redirectUrl: "/dashboard" };
  };

  const logout = async () => {
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setRole(null);
    setMemberships([]);
    setActiveRestaurantIdState(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("scanorder_active_rest_id");
      window.location.href = "/login";
    }
  };

  const activeRestaurant =
    memberships.find((m) => m.restaurantId === activeRestaurantId) ||
    memberships[0] ||
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        memberships,
        activeRestaurant,
        activeRestaurantId: activeRestaurant?.restaurantId || null,
        setActiveRestaurantId,
        isLoading,
        login,
        logout,
        refreshProfile: () => fetchProfile(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
