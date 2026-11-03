"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Building2,
  Sparkles,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role, isLoading, logout } = useAuth();

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "SUPER_ADMIN") {
        router.push("/dashboard");
      }
    }
  }, [isLoading, user, role, router]);

  if (isLoading || role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6">
        <div className="space-y-4 max-w-sm w-full text-center">
          <Skeleton className="h-12 w-12 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-60 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col text-[#29241F]">
      {/* Super Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#29241F] text-white border-b border-[#29241F]/80 shadow-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#C58B45] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  ScanOrder
                </span>
                <span className="text-3xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C58B45]/20 text-[#C58B45] border border-[#C58B45]/30">
                  Super Admin
                </span>
              </div>
              <p className="text-3xs text-[#A8A29E] hidden sm:block">
                Multi-Tenant Platform Control & Subscription Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Restaurant Dashboard</span>
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl border border-white/20 bg-white/5 text-[#A8A29E] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
