"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, role } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user && role) {
      if (role === "SUPER_ADMIN") router.push("/admin");
      else if (role === "KITCHEN_STAFF") router.push("/dashboard/kitchen");
      else router.push("/dashboard");
    }
  }, [user, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { redirectUrl } = await login(email, password);
      router.push(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  const fillQuickAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword("Password123!");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-[#29241F]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#783F24] text-white flex items-center justify-center shadow-md">
          <UtensilsCrossed className="h-7 w-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#29241F]">
          ScanOrder Portal
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] max-w-sm mx-auto">
          Sign in to manage your restaurant orders, live kitchen display, menu, and tables.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl border border-[#E7E1D8] rounded-3xl sm:px-10 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@restaurant.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-sm font-semibold rounded-xl"
              isLoading={isLoading}
              disabled={isLoading}
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Sign-in Helper */}
          <div className="pt-4 border-t border-[#FAF8F4] space-y-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-[#78716C] text-center">
              Quick Test Accounts (Password: Password123!)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickAccount("manager.royal@restaurant.com")}
                className="p-2 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-left hover:bg-[#F3E6D4]/50 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[#783F24]">Manager</div>
                <div className="text-2xs text-[#78716C] truncate">manager.royal</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("chef.royal@restaurant.com")}
                className="p-2 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-left hover:bg-[#F3E6D4]/50 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[#783F24]">Kitchen Staff</div>
                <div className="text-2xs text-[#78716C] truncate">chef.royal</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("owner.royal@restaurant.com")}
                className="p-2 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-left hover:bg-[#F3E6D4]/50 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[#783F24]">Owner</div>
                <div className="text-2xs text-[#78716C] truncate">owner.royal</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount("superadmin@scanorder.com")}
                className="p-2 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-left hover:bg-[#F3E6D4]/50 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-[#783F24]">Super Admin</div>
                <div className="text-2xs text-[#78716C] truncate">superadmin</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#78716C]">
          <ShieldCheck className="h-4 w-4 text-[#557A52]" />
          <span>Role-Based Secure Access with Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
}
