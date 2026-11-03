"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  MapPin,
  Lock,
} from "lucide-react";
import { adminApi, AdminRestaurant, OnboardRestaurantPayload, OnboardingConfirmation } from "@/services/api/admin.api";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuperAdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [createdConfirmation, setCreatedConfirmation] = React.useState<OnboardingConfirmation | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = React.useState<AdminRestaurant | null>(null);
  const [editLimitTarget, setEditLimitTarget] = React.useState<AdminRestaurant | null>(null);

  // Queries
  const { data: restaurants, isLoading: isRestLoading } = useQuery({
    queryKey: ["adminRestaurants"],
    queryFn: () => adminApi.getRestaurants(),
  });

  const { data: plans } = useQuery({
    queryKey: ["adminPlans"],
    queryFn: () => adminApi.getPlans(),
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateRestaurantStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
      setToggleStatusTarget(null);
    },
  });

  const totalCount = restaurants?.length || 0;
  const activeCount = restaurants?.filter((r) => r.is_active).length || 0;
  const inactiveCount = totalCount - activeCount;

  // Filter restaurants
  const filtered = (restaurants || []).filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const email = r.email || r.restaurant_branding?.support_email || "";
      if (
        !r.name.toLowerCase().includes(q) &&
        !r.slug.toLowerCase().includes(q) &&
        !email.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Platform Master Console
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Restaurant Tenants & Subscriptions
          </h1>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Create New Restaurant</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
            Total Tenants
          </span>
          <div className="text-2xl font-black text-[#29241F]">{totalCount}</div>
          <p className="text-3xs text-[#78716C]">Registered SaaS Tenants</p>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
            Active Tenants
          </span>
          <div className="text-2xl font-black text-[#557A52]">{activeCount}</div>
          <p className="text-3xs text-[#557A52]">Live Ordering Enabled</p>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
            Inactive Tenants
          </span>
          <div className="text-2xl font-black text-[#B94A48]">{inactiveCount}</div>
          <p className="text-3xs text-[#78716C]">Suspended / Onboarding</p>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 sm:p-5 shadow-xs space-y-1">
          <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
            Predefined Plans
          </span>
          <div className="text-2xl font-black text-[#C58B45]">3 Plans</div>
          <p className="text-3xs text-[#78716C]">Monthly, 6-Month, Annual</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search by restaurant name, slug, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-xl border border-[#E7E1D8] bg-white pl-9 pr-3 text-xs text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none"
            />
          </div>
          <span className="text-xs text-[#78716C]">
            Showing {filtered.length} restaurants
          </span>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white overflow-hidden shadow-xs">
          {isRestLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#78716C]">
              No restaurants match your search query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Restaurant</th>
                    <th className="px-5 py-3.5">Slug</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Subscription Plan</th>
                    <th className="px-5 py-3.5">Table Limit</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF8F4]">
                  {filtered.map((rest) => {
                    const sub = rest.restaurant_subscriptions?.[0];
                    const plan = sub?.subscription_plans;
                    const planName = plan?.name || "Monthly Plan";
                    const priceFormatted = plan?.price_paise
                      ? `₹${(plan.price_paise / 100).toLocaleString()}`
                      : "₹1,500";
                    const expiryDateStr = sub?.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "30 Days Active";

                    const tableLimit = rest.tableLimit ?? 10;
                    const contactEmail = rest.email || rest.restaurant_branding?.support_email;
                    const contactPhone = rest.phone || rest.restaurant_branding?.support_phone;

                    return (
                      <tr
                        key={rest.id}
                        className="hover:bg-[#FAF8F4] transition-colors cursor-pointer group"
                      >
                        <td
                          className="px-5 py-3.5"
                          onClick={() => router.push(`/admin/restaurants/${rest.id}`)}
                        >
                          <div className="font-bold text-[#29241F] text-sm group-hover:text-[#783F24] transition-colors flex items-center gap-1.5">
                            <span>{rest.name}</span>
                            <span className="text-3xs text-[#783F24] opacity-0 group-hover:opacity-100 transition-opacity">
                              ➔ View
                            </span>
                          </div>
                          <div className="text-3xs text-[#78716C]">
                            Created {new Date(rest.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-mono text-[#783F24]">
                          <a
                            href={`/m/${rest.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            <span>{rest.slug}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </a>
                        </td>

                        <td
                          className="px-5 py-3.5 text-[#78716C] space-y-0.5"
                          onClick={() => router.push(`/admin/restaurants/${rest.id}`)}
                        >
                          {contactEmail && (
                            <div className="flex items-center gap-1 truncate max-w-[160px]">
                              <Mail className="h-3 w-3 text-[#78716C] shrink-0" />
                              <span className="truncate">{contactEmail}</span>
                            </div>
                          )}
                          {contactPhone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-[#78716C] shrink-0" />
                              <span>{contactPhone}</span>
                            </div>
                          )}
                        </td>

                        <td
                          className="px-5 py-3.5 space-y-0.5"
                          onClick={() => router.push(`/admin/restaurants/${rest.id}`)}
                        >
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary">{planName}</Badge>
                            <span className="font-semibold text-2xs text-[#29241F]">
                              {priceFormatted}
                            </span>
                          </div>
                          <div className="text-3xs text-[#78716C] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Expires: {expiryDateStr}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#29241F]">
                              {tableLimit}
                            </span>
                            <span className="text-2xs text-[#78716C]">Tables</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditLimitTarget(rest);
                              }}
                              className="p-1 rounded-md text-[#783F24] hover:bg-[#783F24]/10 transition-colors cursor-pointer"
                              title="Update table limit"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        <td
                          className="px-5 py-3.5"
                          onClick={() => router.push(`/admin/restaurants/${rest.id}`)}
                        >
                          <Badge variant={rest.is_active ? "success" : "danger"}>
                            {rest.is_active ? "Active" : "Suspended"}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => router.push(`/admin/restaurants/${rest.id}`)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#783F24] text-white hover:bg-[#63331D] transition-colors cursor-pointer shadow-2xs"
                            title="Manage Restaurant and Staff"
                          >
                            Details & Staff
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setToggleStatusTarget(rest);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              rest.is_active
                                ? "border border-[#B94A48]/30 text-[#B94A48] hover:bg-[#B94A48]/10"
                                : "border border-[#557A52]/30 text-[#557A52] hover:bg-[#557A52]/10"
                            }`}
                          >
                            {rest.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Onboard Restaurant Modal */}
      {isCreateModalOpen && (
        <CreateRestaurantModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(conf) => {
            setIsCreateModalOpen(false);
            setCreatedConfirmation(conf);
          }}
        />
      )}

      {/* Onboarding Confirmation Success Modal */}
      {createdConfirmation && (
        <Dialog
          isOpen={true}
          onClose={() => setCreatedConfirmation(null)}
          title="Restaurant Successfully Onboarded!"
          size="md"
        >
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-[#557A52]/30 bg-[#557A52]/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#557A52] font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Tenant & Owner Login Ready</span>
              </div>
              <p className="text-xs text-[#29241F]">
                The restaurant <strong>{createdConfirmation.name}</strong> has been onboarded and configured with its dedicated subscription and custom table limits.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E1D8] bg-[#FAF8F4] p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E7E1D8]">
                <div>
                  <span className="text-3xs uppercase font-bold text-[#78716C] block">
                    Restaurant
                  </span>
                  <span className="font-bold text-[#29241F]">{createdConfirmation.name}</span>
                </div>
                <div>
                  <span className="text-3xs uppercase font-bold text-[#78716C] block">
                    Public Slug / URL
                  </span>
                  <span className="font-mono text-[#783F24]">/m/{createdConfirmation.slug}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E7E1D8]">
                <div>
                  <span className="text-3xs uppercase font-bold text-[#78716C] block">
                    Subscription Plan
                  </span>
                  <span className="font-bold text-[#29241F]">
                    {createdConfirmation.subscription?.planName || "Monthly Plan"}
                  </span>
                  <div className="text-3xs text-[#78716C]">
                    Expires {createdConfirmation.subscription?.expiryDate ? new Date(createdConfirmation.subscription.expiryDate).toLocaleDateString() : "30 days"}
                  </div>
                </div>
                <div>
                  <span className="text-3xs uppercase font-bold text-[#78716C] block">
                    Assigned Table Limit
                  </span>
                  <span className="font-bold text-[#29241F] text-sm">
                    {createdConfirmation.tableLimit} Tables Max
                  </span>
                </div>
              </div>

              <div>
                <span className="text-3xs uppercase font-bold text-[#78716C] block">
                  Owner Login Credentials
                </span>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <div className="font-bold text-[#29241F]">{createdConfirmation.owner?.fullName}</div>
                    <div className="text-[#78716C]">{createdConfirmation.owner?.email}</div>
                  </div>
                  <Badge variant="primary">Role: OWNER</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setCreatedConfirmation(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Edit Table Limit Modal */}
      {editLimitTarget && (
        <EditTableLimitModal
          restaurant={editLimitTarget}
          onClose={() => setEditLimitTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
            setEditLimitTarget(null);
          }}
        />
      )}

      {/* Toggle Status Confirmation Modal */}
      {toggleStatusTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setToggleStatusTarget(null)}
          onConfirm={() =>
            toggleMutation.mutate({
              id: toggleStatusTarget.id,
              isActive: !toggleStatusTarget.is_active,
            })
          }
          title={`${
            toggleStatusTarget.is_active ? "Deactivate" : "Activate"
          } "${toggleStatusTarget.name}"?`}
          message={
            toggleStatusTarget.is_active
              ? "Deactivating this restaurant will immediately block customer QR menu scans and order placement."
              : "Activating this restaurant will re-enable digital menu ordering and live operations."
          }
          confirmLabel={toggleStatusTarget.is_active ? "Deactivate" : "Activate"}
          variant={toggleStatusTarget.is_active ? "danger" : "primary"}
          isLoading={toggleMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateRestaurantModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (conf: OnboardingConfirmation) => void;
}) {
  const queryClient = useQueryClient();

  // Restaurant details
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");

  // Plan & Custom Table Limit
  const [planCode, setPlanCode] = React.useState<"MONTHLY" | "SIX_MONTH" | "ANNUAL">("MONTHLY");
  const [maxTables, setMaxTables] = React.useState<number>(15);

  // Owner Credentials
  const [ownerName, setOwnerName] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [ownerPhone, setOwnerPhone] = React.useState("");
  const [ownerPassword, setOwnerPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Auto generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.onboardRestaurant({
        name,
        slug,
        contactEmail: contactEmail || ownerEmail,
        contactPhone: contactPhone || ownerPhone || undefined,
        address: address || undefined,
        logoUrl: logoUrl || undefined,
        planCode,
        maxTables: Number(maxTables),
        ownerName: ownerName || "Restaurant Owner",
        ownerEmail,
        ownerPhone: ownerPhone || contactPhone || undefined,
        ownerPassword,
      }),
    onSuccess: (conf) => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
      onSuccess(conf);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to onboard restaurant.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Restaurant name is required.");
      return;
    }
    if (!slug.trim()) {
      setErrorMsg("Restaurant slug is required.");
      return;
    }
    if (!ownerEmail.trim()) {
      setErrorMsg("Owner email address is required.");
      return;
    }
    if (!ownerPassword || ownerPassword.length < 8) {
      setErrorMsg("Owner initial password must be at least 8 characters.");
      return;
    }
    if (!maxTables || maxTables < 1) {
      setErrorMsg("Please specify a valid maximum table limit (minimum 1 table).");
      return;
    }

    mutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create & Onboard New Restaurant" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5 pt-1">
        {/* Step 1: Restaurant Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#783F24]">
            <Building2 className="h-4 w-4" />
            <span>1. Restaurant Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Restaurant Name"
              placeholder="e.g. Spice Symphony Bistro"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />

            <Input
              label="URL Slug"
              placeholder="e.g. spice-symphony"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              helperText="Digital QR menu will live at /m/[slug]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Contact Email"
              type="email"
              placeholder="contact@restaurant.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="+91 9876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />

            <Input
              label="Logo URL (Optional)"
              type="url"
              placeholder="https://.../logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          <Input
            label="Restaurant Address (Optional)"
            placeholder="e.g. 104 MG Road, Indiranagar, Bengaluru"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* Step 2: Subscription Plan & Custom Table Limit */}
        <div className="space-y-3 pt-2 border-t border-[#E7E1D8]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#783F24]">
            <CreditCard className="h-4 w-4" />
            <span>2. Subscription Plan & Table Limit</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Monthly */}
            <div
              onClick={() => setPlanCode("MONTHLY")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                planCode === "MONTHLY"
                  ? "border-[#783F24] bg-[#783F24]/5 ring-1 ring-[#783F24]"
                  : "border-[#E7E1D8] bg-white hover:border-[#783F24]/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#29241F]">Monthly Plan</span>
                <span className="text-2xs font-bold text-[#783F24]">₹1,500</span>
              </div>
              <p className="text-3xs text-[#78716C] mt-1">1 Month Full Access</p>
            </div>

            {/* 6-Month */}
            <div
              onClick={() => setPlanCode("SIX_MONTH")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                planCode === "SIX_MONTH"
                  ? "border-[#783F24] bg-[#783F24]/5 ring-1 ring-[#783F24]"
                  : "border-[#E7E1D8] bg-white hover:border-[#783F24]/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#29241F]">6-Month Plan</span>
                <span className="text-2xs font-bold text-[#557A52]">₹6,000</span>
              </div>
              <p className="text-3xs text-[#78716C] mt-1">6 Months Validity</p>
            </div>

            {/* Annual */}
            <div
              onClick={() => setPlanCode("ANNUAL")}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                planCode === "ANNUAL"
                  ? "border-[#783F24] bg-[#783F24]/5 ring-1 ring-[#783F24]"
                  : "border-[#E7E1D8] bg-white hover:border-[#783F24]/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#29241F]">Annual Plan</span>
                <span className="text-2xs font-bold text-[#C58B45]">₹10,000</span>
              </div>
              <p className="text-3xs text-[#78716C] mt-1">12 Months (Best Value)</p>
            </div>
          </div>

          {/* Custom Table Limit Input */}
          <div className="rounded-2xl bg-[#FAF8F4] p-3.5 border border-[#E7E1D8] space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#29241F]">
                Maximum Allowed Tables <span className="text-[#B94A48]">*</span>
              </label>
              <span className="text-3xs text-[#78716C]">
                Configured independently per restaurant
              </span>
            </div>
            <Input
              type="number"
              min={1}
              max={1000}
              required
              value={maxTables}
              onChange={(e) => setMaxTables(parseInt(e.target.value, 10) || 1)}
              helperText="The backend validates this limit during table creation to prevent the owner from exceeding it. You can adjust this limit anytime."
            />
          </div>
        </div>

        {/* Step 3: Initial Restaurant Owner Credentials */}
        <div className="space-y-3 pt-2 border-t border-[#E7E1D8]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#783F24]">
            <Lock className="h-4 w-4" />
            <span>3. Restaurant Owner Login Credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Owner Full Name"
              placeholder="e.g. Vikram Malhotra"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />

            <Input
              label="Owner Email Address (Login ID)"
              type="email"
              placeholder="owner@restaurant.com"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Owner Phone Number"
              placeholder="+91 9876543210"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />

            <div className="relative">
              <Input
                label="Initial Password (Min 8 Characters)"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                helperText="Stored securely in Supabase Auth (never plaintext)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-[#78716C] hover:text-[#29241F]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-[#E7E1D8]">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={mutation.isPending}>
            Onboard Restaurant Tenant
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditTableLimitModal({
  restaurant,
  onClose,
  onSuccess,
}: {
  restaurant: AdminRestaurant;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [maxTables, setMaxTables] = React.useState<number>(restaurant.tableLimit || 15);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateTableLimit(restaurant.id, maxTables),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to update table limit.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maxTables || maxTables < 1) {
      setErrorMsg("Table limit must be at least 1 table.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog isOpen={true} onClose={onClose} title={`Update Table Limit — ${restaurant.name}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <p className="text-xs text-[#78716C]">
          Adjust the maximum allowed tables for <strong>{restaurant.name}</strong>. The owner will immediately be permitted to create tables up to this new limit.
        </p>

        <Input
          label="Maximum Allowed Tables"
          type="number"
          min={1}
          max={1000}
          required
          value={maxTables}
          onChange={(e) => setMaxTables(parseInt(e.target.value, 10) || 1)}
        />

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={mutation.isPending}>
            Save Table Limit
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
