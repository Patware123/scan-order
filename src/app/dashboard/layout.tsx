"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu as MenuIcon,
  X,
  ChevronDown,
  Sparkles,
  Building2,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
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
  { name: "Reports & Sales", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Staff & Team", href: "/dashboard/staff", icon: Users },
  { name: "Branding & Settings", href: "/dashboard/settings", icon: Settings },
];

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
      {/* Top Navbar */}
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

            {/* Brand Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#783F24] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                SO
              </div>
              <span className="font-bold text-base hidden sm:inline-block tracking-tight text-[#29241F]">
                ScanOrder
              </span>
            </div>

            {/* Restaurant Selector */}
            {memberships.length > 0 && (
              <div className="relative ml-2 sm:ml-4">
                <button
                  onClick={() => setIsRestaurantDropdownOpen(!isRestaurantDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] hover:bg-[#F3E6D4]/40 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-[#783F24]" />
                  <span className="max-w-[130px] sm:max-w-[180px] truncate">
                    {activeRestaurant?.name || "Select Restaurant"}
                  </span>
                  {memberships.length > 1 && <ChevronDown className="h-3.5 w-3.5 text-[#78716C]" />}
                </button>

                {isRestaurantDropdownOpen && memberships.length > 1 && (
                  <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-[#E7E1D8] shadow-lg p-1.5 z-50">
                    <div className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-[#78716C]">
                      Switch Restaurant
                    </div>
                    {memberships.map((m) => (
                      <button
                        key={m.restaurantId}
                        onClick={() => {
                          setActiveRestaurantId(m.restaurantId);
                          setIsRestaurantDropdownOpen(false);
                          window.location.reload();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          m.restaurantId === activeRestaurantId
                            ? "bg-[#F3E6D4] text-[#783F24] font-bold"
                            : "hover:bg-[#FAF8F4] text-[#29241F]"
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                        <span className="text-3xs px-1.5 py-0.5 rounded-md bg-[#FAF8F4] border border-[#E7E1D8] text-[#78716C]">
                          {m.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <div className="px-3 py-2 text-2xs font-bold uppercase tracking-wider text-[#78716C]">
            {isKitchen ? "Kitchen Station" : "Restaurant Management"}
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
                Platform
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#C58B45] hover:bg-[#F3E6D4]/40 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Super Admin Portal</span>
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
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-[#783F24] text-white flex items-center justify-center font-bold text-xs">
                      SO
                    </div>
                    <span className="font-bold text-sm text-[#29241F]">
                      ScanOrder
                    </span>
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
