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
  Receipt,
  Plus,
  Trash2,
  Percent,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { formatPaiseToINR } from "@/lib/utils/currency";

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
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${orderingMode === "STAFF_SERVED"
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
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${orderingMode === "SELF_SERVICE"
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

      {/* Taxes (GST) Configuration Section */}
      <GstTaxConfigurationSection restaurantId={activeRestaurantId} />

      {/* Other Additional Charges Section */}
      <TaxesAndChargesSection restaurantId={activeRestaurantId} />
    </div>
  );
}

// -------------------------------------------------------------------
// Taxes (GST) Configuration Component
// -------------------------------------------------------------------
function GstTaxConfigurationSection({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient();
  const [isGstEnabled, setIsGstEnabled] = React.useState(false);
  const [gstPercentage, setGstPercentage] = React.useState<string>("5");
  const [gstNumber, setGstNumber] = React.useState<string>("");
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch current tax config
  const { data: taxConfig, isLoading } = useQuery({
    queryKey: ["restaurantTaxConfig", restaurantId],
    queryFn: () => restaurantApi.getTaxConfig(restaurantId),
    enabled: !!restaurantId,
  });

  React.useEffect(() => {
    if (taxConfig) {
      setIsGstEnabled(taxConfig.isGstEnabled);
      setGstPercentage(
        taxConfig.gstPercentage !== undefined && taxConfig.gstPercentage !== null
          ? String(taxConfig.gstPercentage)
          : "5"
      );
      setGstNumber(taxConfig.gstNumber || "");
    }
  }, [taxConfig]);

  const mutation = useMutation({
    mutationFn: () => {
      const pct = parseFloat(gstPercentage);
      if (isGstEnabled && (isNaN(pct) || pct < 0 || pct > 100)) {
        throw new Error("Please enter a valid GST percentage between 0% and 100%.");
      }
      return restaurantApi.updateTaxConfig(restaurantId, {
        isGstEnabled,
        gstPercentage: isGstEnabled ? pct : 0,
        gstNumber: gstNumber.trim() || null,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["restaurantTaxConfig", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["charges", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurantCharges", restaurantId] });
      setSuccessMsg(
        data.isGstEnabled
          ? `Taxes (GST ${data.gstPercentage}%) configured and enabled successfully!`
          : "Taxes (GST) disabled. No taxes will be displayed to customers."
      );
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update tax configuration.");
      setSuccessMsg(null);
    },
  });

  const handlePresetClick = (pct: number) => {
    setGstPercentage(String(pct));
    if (!isGstEnabled) {
      setIsGstEnabled(true);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="max-w-3xl rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#FAF8F4] pb-3">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-[#783F24]" />
          <div>
            <h2 className="text-sm font-bold text-[#29241F]">
              Taxes (GST) Configuration
            </h2>
            <p className="text-2xs text-[#78716C]">
              Configure your restaurant GST percentage. If disabled or not set, taxes are hidden on customer bills.
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-lg text-2xs font-bold border ${
            isGstEnabled && parseFloat(gstPercentage) > 0
              ? "bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/30"
              : "bg-[#78716C]/10 text-[#78716C] border-[#78716C]/30"
          }`}
        >
          {isGstEnabled && parseFloat(gstPercentage) > 0
            ? `Active (${gstPercentage}% GST)`
            : "Tax Not Applied"}
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-xl" />
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Enable / Disable GST Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4]/50">
            <div>
              <span className="text-xs font-bold text-[#29241F] block">
                Enable Taxes (GST)
              </span>
              <p className="text-2xs text-[#78716C] mt-0.5">
                Calculate GST at checkout. When turned off, menu prices are final and no tax line is shown.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGstEnabled(!isGstEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isGstEnabled ? "bg-[#783F24]" : "bg-[#D6D3D1]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isGstEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {isGstEnabled && (
            <div className="space-y-4 pt-1">
              {/* Presets and Custom Percentage */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#29241F]">
                  GST Percentage Rate (%)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[5, 12, 18].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handlePresetClick(rate)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        parseFloat(gstPercentage) === rate
                          ? "border-[#783F24] bg-[#F3E6D4]/50 text-[#783F24] ring-1 ring-[#783F24]"
                          : "border-[#E7E1D8] bg-white text-[#78716C] hover:bg-[#FAF8F4]"
                      }`}
                    >
                      {rate}% {rate === 5 ? "(Standard Food & Beverage)" : ""}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <Input
                    label="Custom Tax Percentage (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(e.target.value)}
                    placeholder="e.g. 5"
                    helperText="Applied to order subtotal"
                  />

                  <Input
                    label="GSTIN / Tax ID (Optional)"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    helperText="Printed on digital receipt and tax invoice"
                  />
                </div>
              </div>

              {/* Status Explanation Box */}
              <div className="rounded-xl border border-[#557A52]/20 bg-[#557A52]/5 p-3 text-2xs text-[#557A52]">
                <p className="font-semibold">
                  Taxes will be calculated at checkout as &ldquo;Taxes (GST {gstPercentage || "0"}%)&rdquo;.
                </p>
                <p className="text-[#78716C] mt-0.5">
                  Customers will see this tax breakdown before placing orders and on order tracking invoices.
                </p>
              </div>
            </div>
          )}

          {!isGstEnabled && (
            <div className="rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] p-3 text-2xs text-[#78716C]">
              <span className="font-semibold text-[#29241F]">Taxes are currently disabled.</span>{" "}
              Menu item prices will be treated as final (inclusive). The &ldquo;Taxes (GST)&rdquo; line will be completely hidden from customer carts and receipts.
            </div>
          )}

          {/* Feedback Messages */}
          {successMsg && (
            <div className="rounded-xl border border-[#557A52]/30 bg-[#557A52]/10 p-3 text-xs text-[#557A52] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={mutation.isPending}
              className="px-6"
            >
              Save GST Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Additional Charges Component (Packaging, Delivery, etc.)
// -------------------------------------------------------------------
function TaxesAndChargesSection({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const { data: rawCharges, isLoading } = useQuery({
    queryKey: ["charges", restaurantId],
    queryFn: () => restaurantApi.getCharges(restaurantId),
    enabled: !!restaurantId,
  });

  // Filter out any charges named GST since GST has its own dedicated configuration above
  const charges = React.useMemo(() => {
    return (rawCharges || []).filter((c) => !c.name.toLowerCase().includes("gst"));
  }, [rawCharges]);

  const toggleMutation = useMutation({
    mutationFn: ({ chargeId, isActive }: { chargeId: string; isActive: boolean }) =>
      restaurantApi.updateCharge(restaurantId, chargeId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["charges", restaurantId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chargeId: string) =>
      restaurantApi.deleteCharge(restaurantId, chargeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["charges", restaurantId] });
    },
  });

  return (
    <div className="max-w-3xl rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#FAF8F4] pb-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[#783F24]" />
          <div>
            <h2 className="text-sm font-bold text-[#29241F]">
              Additional Restaurant Charges
            </h2>
            <p className="text-2xs text-[#78716C]">
              Configure optional non-tax fees like packaging fees, parcel charges, or delivery fees.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          <span>Add Charge</span>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : !charges || charges.length === 0 ? (
        <div className="rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] p-6 text-center text-xs text-[#78716C] space-y-2">
          <Receipt className="h-6 w-6 text-[#783F24] mx-auto opacity-70" />
          <p className="font-medium text-[#29241F]">No Additional Charges Configured</p>
          <p className="text-2xs">
            Add packaging fees for takeaway or custom service charges if needed.
          </p>
          <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
            Add Custom Charge
          </Button>
        </div>
      ) : (
        <div className="space-y-2 divide-y divide-[#FAF8F4]">
          {charges.map((c) => (
            <div
              key={c.id}
              className="pt-2 first:pt-0 flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#29241F]">{c.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-[#783F24]/10 text-[#783F24]">
                    {c.charge_type === "PERCENTAGE" ? `${c.rate_or_amount}%` : formatPaiseToINR(c.rate_or_amount)}
                  </span>
                  <span className="text-3xs text-[#78716C] uppercase font-mono">
                    {c.applies_to}
                  </span>
                </div>
                <span className="text-3xs text-[#78716C]">
                  {c.charge_type === "PERCENTAGE"
                    ? "Percentage of order subtotal"
                    : "Fixed amount per order"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({
                      chargeId: c.id,
                      isActive: !c.is_active,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors cursor-pointer ${c.is_active
                      ? "bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/30"
                      : "bg-[#78716C]/10 text-[#78716C] border-[#78716C]/30"
                    }`}
                >
                  {c.is_active ? "Active" : "Disabled"}
                </button>

                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="p-1 rounded-lg text-[#78716C] hover:bg-[#B94A48]/10 hover:text-[#B94A48] transition-colors cursor-pointer"
                  title="Delete charge"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <AddChargeModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          restaurantId={restaurantId}
        />
      )}
    </div>
  );
}

// Add Charge Modal
function AddChargeModal({
  isOpen,
  onClose,
  restaurantId,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [chargeType, setChargeType] = React.useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [valueInput, setValueInput] = React.useState("5");
  const [appliesTo, setAppliesTo] = React.useState<"ALL" | "DINE_IN" | "PARCEL">("ALL");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const numVal = parseFloat(valueInput);
      const rateOrAmount =
        chargeType === "PERCENTAGE" ? numVal : Math.round(numVal * 100);

      return restaurantApi.createCharge(restaurantId, {
        name: name.trim(),
        chargeType,
        rateOrAmount,
        appliesTo,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["charges", restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create charge");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const val = parseFloat(valueInput);
    if (isNaN(val) || val <= 0) {
      setErrorMsg("Please enter a valid rate or amount greater than 0");
      return;
    }
    setErrorMsg(null);
    mutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add Tax or Charge" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Charge Name"
          placeholder="e.g. GST, Restaurant Service Charge, Packaging Fee"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Calculation Type
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setChargeType("PERCENTAGE");
                setValueInput("5");
              }}
              className={`p-2.5 rounded-xl border text-center font-semibold cursor-pointer ${chargeType === "PERCENTAGE"
                  ? "border-[#783F24] bg-[#F3E6D4]/30 text-[#783F24]"
                  : "border-[#E7E1D8] bg-white text-[#78716C]"
                }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => {
                setChargeType("FIXED");
                setValueInput("20");
              }}
              className={`p-2.5 rounded-xl border text-center font-semibold cursor-pointer ${chargeType === "FIXED"
                  ? "border-[#783F24] bg-[#F3E6D4]/30 text-[#783F24]"
                  : "border-[#E7E1D8] bg-white text-[#78716C]"
                }`}
            >
              Fixed Amount (₹)
            </button>
          </div>
        </div>

        <Input
          label={chargeType === "PERCENTAGE" ? "Percentage Rate (%)" : "Fixed Amount (₹)"}
          type="number"
          step="any"
          min="0.01"
          required
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
          placeholder={chargeType === "PERCENTAGE" ? "5" : "20.00"}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Applies To
          </label>
          <select
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as any)}
            className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
          >
            <option value="ALL">All Orders (Dine-In & Takeaway)</option>
            <option value="DINE_IN">Dine-In Orders Only</option>
            <option value="PARCEL">Parcel / Takeaway Orders Only</option>
          </select>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-3 border-t border-[#E7E1D8]">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={mutation.isPending}>
            Save Charge
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
