"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  UtensilsCrossed,
  QrCode,
  Boxes,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: Array<"SUPER_ADMIN" | "OWNER" | "MANAGER" | "KITCHEN_STAFF">;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Live Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { name: "Kitchen Display (KDS)", href: "/dashboard/kitchen", icon: ChefHat },
  { name: "Menu & Categories", href: "/dashboard/menu", icon: UtensilsCrossed },
  { name: "Tables & QR Codes", href: "/dashboard/tables", icon: QrCode },
  { name: "Inventory", href: "/dashboard/inventory", icon: Boxes },
  { name: "Reports & Sales", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Staff & Team", href: "/dashboard/staff", icon: Users },
  { name: "Branding & Settings", href: "/dashboard/settings", icon: Settings },
];

function getRestaurantInitials(name?: string): string {
  if (!name || name === "Select Restaurant" || name === "Restaurant") return "R";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    role,
    memberships,
    activeRestaurant,
    activeRestaurantId,
    setActiveRestaurantId,
    isLoading,
    logout,
  } = useAuth();

  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [isRestaurantDropdownOpen, setIsRestaurantDropdownOpen] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);

  // Fetch live restaurant branding for real-time synchronization
  const { data: branding } = useQuery({
    queryKey: ["branding", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getBranding(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
    staleTime: 60000,
  });

  const restaurantName = branding?.name || activeRestaurant?.name || "Restaurant";
  const restaurantLogo = branding?.logo_url || activeRestaurant?.logoUrl || null;
  const restaurantColor = branding?.primary_color || activeRestaurant?.primaryColor || "#783F24";

  // Reset logo error when restaurant changes
  React.useEffect(() => {
    setLogoError(false);
  }, [activeRestaurantId, restaurantLogo]);

  // Set document title to restaurant's brand name so browser tab is white-labeled
  React.useEffect(() => {
    if (restaurantName && restaurantName !== "Restaurant") {
      document.title = `${restaurantName} — Portal`;
    }
  }, [restaurantName]);

  // Close mobile nav on route change
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  // Auth Protection & Kitchen role redirection
  const isKitchen = role === "KITCHEN" || role === "KITCHEN_STAFF";

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (!isLoading && user && isKitchen) {
      if (pathname !== "/dashboard/kitchen") {
        router.replace("/dashboard/kitchen");
      }
    }
  }, [isLoading, user, isKitchen, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6">
        <div className="space-y-4 max-w-sm w-full text-center">
          <Skeleton className="h-12 w-12 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-4 w-60 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Filter items based on current role - Kitchen ONLY sees Kitchen Display (KDS)
  const allowedNav = NAV_ITEMS.filter((item) => {
    if (isKitchen) {
      return item.href === "/dashboard/kitchen";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col text-[#29241F]">
      {/* Top Navbar - 100% White-Labeled to Tenant Brand */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E7E1D8] shadow-2xs">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Nav Trigger */}
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="lg:hidden p-2 rounded-xl text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F] cursor-pointer"
              aria-label="Toggle navigation"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            {/* Restaurant Brand Header & Outlet Switcher */}
            <div className="relative">
              {memberships.length > 1 ? (
                <button
                  onClick={() => setIsRestaurantDropdownOpen(!isRestaurantDropdownOpen)}
                  className="flex items-center gap-2.5 sm:gap-3 p-1 rounded-2xl hover:bg-[#FAF8F4] transition-all cursor-pointer group text-left"
                >
                  {restaurantLogo && !logoError ? (
                    <img
                      src={restaurantLogo}
                      alt={restaurantName}
                      onError={() => setLogoError(true)}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover border border-[#E7E1D8] shadow-xs shrink-0"
                    />
                  ) : (
                    <div
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-xs shrink-0"
                      style={{ backgroundColor: restaurantColor }}
                    >
                      {getRestaurantInitials(restaurantName)}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#29241F] truncate max-w-[140px] sm:max-w-[240px] md:max-w-[320px]">
                        {restaurantName}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-[#78716C] group-hover:text-[#29241F] transition-transform duration-200 shrink-0" />
                    </div>
                    <span className="text-3xs font-semibold uppercase tracking-wider text-[#78716C] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {isKitchen ? "Kitchen Station" : "Live Store"}
                    </span>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {restaurantLogo && !logoError ? (
                    <img
                      src={restaurantLogo}
                      alt={restaurantName}
                      onError={() => setLogoError(true)}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl object-cover border border-[#E7E1D8] shadow-xs shrink-0"
                    />
                  ) : (
                    <div
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-xs shrink-0"
                      style={{ backgroundColor: restaurantColor }}
                    >
                      {getRestaurantInitials(restaurantName)}
                    </div>
                  )}

                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#29241F] truncate max-w-[150px] sm:max-w-[260px] md:max-w-[340px]">
                      {restaurantName}
                    </span>
                    <span className="text-3xs font-semibold uppercase tracking-wider text-[#78716C] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {isKitchen ? "Kitchen Station" : "Live Store"}
                    </span>
                  </div>
                </div>
              )}

              {/* Multi-Outlet Dropdown Menu */}
              {isRestaurantDropdownOpen && memberships.length > 1 && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-[#E7E1D8] shadow-xl p-2 z-50">
                  <div className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-[#78716C]">
                    Switch Branch / Outlet
                  </div>
                  <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                    {memberships.map((m) => (
                      <button
                        key={m.restaurantId}
                        onClick={() => {
                          setActiveRestaurantId(m.restaurantId);
                          setIsRestaurantDropdownOpen(false);
                          window.location.reload();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          m.restaurantId === activeRestaurantId
                            ? "bg-[#F3E6D4] text-[#783F24]"
                            : "hover:bg-[#FAF8F4] text-[#29241F]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className="h-6 w-6 rounded-md text-white text-3xs font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: m.primaryColor || "#783F24" }}
                          >
                            {getRestaurantInitials(m.name)}
                          </div>
                          <span className="truncate">{m.name}</span>
                        </div>
                        <span className="text-3xs px-1.5 py-0.5 rounded-md bg-white border border-[#E7E1D8] text-[#78716C] shrink-0">
                          {m.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {role && (
              <Badge variant="primary" className="hidden sm:inline-flex text-xs py-0.5">
                {isKitchen ? "KITCHEN" : role}
              </Badge>
            )}

            {!isKitchen && (
              <button
                onClick={() => router.push("/dashboard/kitchen")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#783F24]/30 bg-[#783F24]/10 text-xs font-semibold text-[#783F24] hover:bg-[#783F24]/20 transition-colors cursor-pointer"
              >
                <ChefHat className="h-4 w-4" />
                <span className="hidden md:inline">Kitchen Display</span>
              </button>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl border border-[#E7E1D8] bg-white text-[#78716C] hover:text-[#B94A48] hover:bg-[#B94A48]/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar (visible on lg+) */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-[#E7E1D8] bg-white p-4 space-y-1 shrink-0">
          <div className="px-3 py-2 text-2xs font-bold uppercase tracking-wider text-[#78716C] truncate">
            {isKitchen ? "Kitchen Station" : `${restaurantName} Operations`}
          </div>

          <nav className="space-y-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#783F24] text-white shadow-xs"
                      : "text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {role === "SUPER_ADMIN" && (
            <div className="pt-4 border-t border-[#FAF8F4] space-y-1">
              <div className="px-3 py-1 text-2xs font-bold uppercase tracking-wider text-[#78716C]">
                Platform Control
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#C58B45] hover:bg-[#F3E6D4]/40 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Admin Console</span>
              </button>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-[#29241F]/40 backdrop-blur-xs"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white p-5 border-r border-[#E7E1D8] shadow-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#FAF8F4]">
                  <div className="flex items-center gap-2.5">
                    {restaurantLogo && !logoError ? (
                      <img
                        src={restaurantLogo}
                        alt={restaurantName}
                        onError={() => setLogoError(true)}
                        className="h-8 w-8 rounded-lg object-cover border border-[#E7E1D8] shadow-xs shrink-0"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0"
                        style={{ backgroundColor: restaurantColor }}
                      >
                        {getRestaurantInitials(restaurantName)}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-[#29241F] truncate max-w-[170px]">
                        {restaurantName}
                      </span>
                      <span className="text-3xs font-medium text-[#78716C]">
                        {isKitchen ? "Kitchen Display" : "Management Hub"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileNavOpen(false)}
                    className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#FAF8F4] cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {allowedNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setIsMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[#783F24] text-white"
                            : "text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F]"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#FAF8F4]">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#B94A48] hover:bg-[#B94A48]/10 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
