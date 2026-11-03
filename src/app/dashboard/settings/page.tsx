"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Building2,
  Phone,
  Mail,
  MapPin,
  Palette,
  Upload,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function RestaurantSettingsPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId } = useAuth();

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [orderingMode, setOrderingMode] = React.useState<"SELF_SERVICE" | "STAFF_SERVED">("STAFF_SERVED");
  const [primaryColor, setPrimaryColor] = React.useState("#783F24");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch current branding
  const { data: branding, isLoading } = useQuery({
    queryKey: ["branding", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getBranding(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
  });

  // Populate form when data loads
  React.useEffect(() => {
    if (branding) {
      setName(branding.name || "");
      setPhone(branding.phone || "");
      setEmail(branding.email || "");
      setAddress(branding.address || "");
      setOrderingMode(branding.ordering_mode || "STAFF_SERVED");
      setPrimaryColor(branding.primary_color || "#783F24");
      setLogoUrl(branding.logo_url || "");
    }
  }, [branding]);

  // Mutation
  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.updateBranding(activeRestaurantId!, {
        name,
        phone,
        email,
        address,
        ordering_mode: orderingMode,
        primary_color: primaryColor,
        logo_url: logoUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branding", activeRestaurantId] });
      setSuccessMsg("Restaurant settings and branding updated successfully!");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to update settings.");
      setSuccessMsg(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setErrorMsg("Restaurant name is required.");
      return;
    }
    mutation.mutate();
  };

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
          Configuration
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
          Branding & Restaurant Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
          Manage your restaurant profile, contact information, customer ordering mode, and theme accents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Identity Card */}
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
            <Building2 className="h-4 w-4 text-[#783F24]" />
            <h2 className="text-sm font-bold text-[#29241F]">Restaurant Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Restaurant Public Name"
              placeholder="e.g. The Royal Biryani House"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#29241F]">
                Unique Slug
              </label>
              <input
                type="text"
                disabled
                value={branding?.slug || ""}
                className="flex h-11 w-full rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] px-3.5 py-2 text-sm text-[#78716C] cursor-not-allowed"
              />
              <p className="text-3xs text-[#78716C]">
                Used in your public menu URL (e.g. /m/{branding?.slug}/token)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Displayed to customers if they need order help"
            />

            <Input
              label="Support / Billing Email"
              type="email"
              placeholder="orders@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29241F]">
              Physical Address
            </label>
            <textarea
              rows={2}
              placeholder="Street address, city, state, postal code..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-[#E7E1D8] p-2.5 text-xs sm:text-sm text-[#29241F] focus:border-[#783F24] focus:outline-none"
            />
          </div>
        </div>

        {/* Ordering Mode Card */}
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
            <Settings className="h-4 w-4 text-[#783F24]" />
            <h2 className="text-sm font-bold text-[#29241F]">Ordering Operations</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29241F]">
              Default Restaurant Service Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                onClick={() => setOrderingMode("STAFF_SERVED")}
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  orderingMode === "STAFF_SERVED"
                    ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                    : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
                }`}
              >
                <div>
                  <span className="text-sm font-bold text-[#29241F] block">
                    Table Service (Staff Serves)
                  </span>
                  <p className="text-xs text-[#78716C] mt-1">
                    Customers sit at tables, scan QR, and waiters bring food directly to the table.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setOrderingMode("SELF_SERVICE")}
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  orderingMode === "SELF_SERVICE"
                    ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                    : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
                }`}
              >
                <div>
                  <span className="text-sm font-bold text-[#29241F] block">
                    Self-Service (Counter Pickup)
                  </span>
                  <p className="text-xs text-[#78716C] mt-1">
                    Ideal for cafes, food courts, and quick service. Diners collect orders at counter.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Visual Branding Card */}
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
            <Palette className="h-4 w-4 text-[#783F24]" />
            <h2 className="text-sm font-bold text-[#29241F]">Menu Branding & Accent Color</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#29241F]">
                Primary Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-[#E7E1D8] cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs font-mono text-[#29241F]"
                />
              </div>
            </div>

            <Input
              label="Logo Image URL (Optional)"
              placeholder="https://.../logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              helperText="Appears on customer digital menu header"
            />
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="rounded-xl border border-[#557A52]/30 bg-[#557A52]/10 p-3.5 text-xs text-[#557A52] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3.5 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={mutation.isPending}
            className="px-8"
          >
            Save Restaurant Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
