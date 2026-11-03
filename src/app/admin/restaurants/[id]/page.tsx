"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ArrowLeft,
  Users,
  Shield,
  CreditCard,
  Sliders,
  ExternalLink,
  CheckCircle2,
  XCircle,
  KeyRound,
  UserPlus,
  RefreshCw,
  ChefHat,
  Save,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import { adminApi, AdminRestaurant } from "@/services/api/admin.api";
import { restaurantApi, RestaurantStaffMember } from "@/services/api/restaurant.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function RestaurantDetailsPageWrapper() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6">
          <Skeleton className="h-16 w-64 rounded-2xl" />
        </div>
      }
    >
      <RestaurantDetailsContent />
    </React.Suspense>
  );
}

function RestaurantDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const restaurantId = params?.id as string;

  const [activeTab, setActiveTab] = React.useState<"info" | "staff" | "subscription">("info");

  // Edit Restaurant Details Form State
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [formSuccessMsg, setFormSuccessMsg] = React.useState<string | null>(null);
  const [formErrorMsg, setFormErrorMsg] = React.useState<string | null>(null);

  // Table Limit State
  const [tableLimit, setTableLimit] = React.useState("10");

  // Staff Modals State
  const [isAddStaffOpen, setIsAddStaffOpen] = React.useState(false);
  const [resetTarget, setResetTarget] = React.useState<RestaurantStaffMember | null>(null);

  // 1. Fetch Restaurant Info
  const { data: restaurant, isLoading: isRestLoading } = useQuery({
    queryKey: ["adminRestaurant", restaurantId],
    queryFn: () => adminApi.getRestaurantById(restaurantId),
    enabled: !!restaurantId,
  });

  // 2. Fetch Restaurant Staff
  const { data: staffList, isLoading: isStaffLoading } = useQuery({
    queryKey: ["adminRestaurantStaff", restaurantId],
    queryFn: () => restaurantApi.getStaff(restaurantId),
    enabled: !!restaurantId,
  });

  // Populate form when restaurant data loads
  React.useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || "");
      setSlug(restaurant.slug || "");
      setContactEmail(
        restaurant.email ||
        restaurant.restaurant_branding?.support_email ||
        ""
      );
      setContactPhone(
        restaurant.phone ||
        restaurant.restaurant_branding?.support_phone ||
        ""
      );
      const cleanAddress =
        restaurant.address ||
        (restaurant.restaurant_branding?.tagline
          ? restaurant.restaurant_branding.tagline.replace(/\[TABLE_LIMIT:\d+\]\s*/g, "").trim()
          : "");
      setAddress(cleanAddress);
      setLogoUrl(restaurant.restaurant_branding?.logo_url || "");
      setTableLimit(String(restaurant.tableLimit || 10));
    }
  }, [restaurant]);

  // Mutations
  const updateDetailsMutation = useMutation({
    mutationFn: () =>
      adminApi.updateRestaurantDetails(restaurantId, {
        name: name.trim(),
        slug: slug.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        address: address.trim(),
        logoUrl: logoUrl.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurant", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
      setFormSuccessMsg("Restaurant information saved successfully!");
      setFormErrorMsg(null);
      setTimeout(() => setFormSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setFormErrorMsg(err?.message || "Failed to update restaurant information");
      setFormSuccessMsg(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus: boolean) =>
      adminApi.updateRestaurantStatus(restaurantId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurant", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
    },
  });

  const updateTableLimitMutation = useMutation({
    mutationFn: (newLimit: number) =>
      adminApi.updateTableLimit(restaurantId, newLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurant", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
      setFormSuccessMsg("Table limit updated successfully!");
      setTimeout(() => setFormSuccessMsg(null), 4000);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: (planCode: string) =>
      adminApi.updateSubscription(restaurantId, { planCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurant", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["adminRestaurants"] });
      setFormSuccessMsg("Subscription plan updated successfully!");
      setTimeout(() => setFormSuccessMsg(null), 4000);
    },
  });

  const toggleStaffStatusMutation = useMutation({
    mutationFn: ({ staffId, isActive }: { staffId: string; isActive: boolean }) =>
      restaurantApi.updateStaffStatus(restaurantId, staffId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminRestaurantStaff", restaurantId] });
    },
  });

  if (isRestLoading || !restaurant) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] p-6 lg:p-10 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  const sub = restaurant.restaurant_subscriptions?.[0];
  const plan = sub?.subscription_plans;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#29241F] p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#783F24] hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Super Admin Portal</span>
        </button>

        <Badge
          variant={restaurant.is_active ? "success" : "danger"}
          className="text-xs py-1 px-3"
        >
          {restaurant.is_active ? "Restaurant Active" : "Restaurant Deactivated"}
        </Badge>
      </div>

      {/* Restaurant Header Banner Card */}
      <div className="rounded-3xl bg-white border border-[#E7E1D8] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {restaurant.restaurant_branding?.logo_url ? (
            <img
              src={restaurant.restaurant_branding.logo_url}
              alt={restaurant.name}
              className="h-16 w-16 rounded-2xl object-cover border border-[#E7E1D8] shadow-xs"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-[#783F24] text-white flex items-center justify-center font-black text-xl shadow-xs">
              {restaurant.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#29241F]">
              {restaurant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
              <span className="font-mono bg-[#FAF8F4] px-2 py-0.5 rounded-md border border-[#E7E1D8]">
                /{restaurant.slug}
              </span>
              <span>•</span>
              <span>ID: {restaurant.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant={restaurant.is_active ? "danger" : "primary"}
            isLoading={toggleStatusMutation.isPending}
            onClick={() => toggleStatusMutation.mutate(!restaurant.is_active)}
          >
            {restaurant.is_active ? "Deactivate Restaurant" : "Activate Restaurant"}
          </Button>

          <a
            href={`/m/${restaurant.slug}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] hover:bg-[#F3E6D4]/40 text-xs font-semibold text-[#29241F] transition-colors"
          >
            <span>Preview Menu</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Subscription Plan */}
        <div className="rounded-2xl bg-white border border-[#E7E1D8] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider font-bold text-[#78716C]">
            <span>Subscription Plan</span>
            <CreditCard className="h-4 w-4 text-[#783F24]" />
          </div>
          <div className="text-lg font-black text-[#29241F]">
            {plan?.name || "Monthly Plan"}
          </div>
          <div className="text-xs text-[#78716C]">
            {formatPaiseToINR(plan?.price_paise || 150000)} • Expires:{" "}
            {sub?.current_period_end
              ? new Date(sub.current_period_end).toLocaleDateString()
              : "Active"}
          </div>
        </div>

        {/* Max Tables */}
        <div className="rounded-2xl bg-white border border-[#E7E1D8] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider font-bold text-[#78716C]">
            <span>Custom Table Limit</span>
            <Sliders className="h-4 w-4 text-[#783F24]" />
          </div>
          <div className="text-lg font-black text-[#29241F]">
            {restaurant.tableLimit || 10} Tables Allowed
          </div>
          <div className="text-xs text-[#78716C]">
            Backend enforced • Configured by Super Admin
          </div>
        </div>

        {/* Staff Members */}
        <div className="rounded-2xl bg-white border border-[#E7E1D8] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider font-bold text-[#78716C]">
            <span>Team Accounts</span>
            <Users className="h-4 w-4 text-[#783F24]" />
          </div>
          <div className="text-lg font-black text-[#29241F]">
            {staffList?.length || 0} Staff Active
          </div>
          <div className="text-xs text-[#78716C]">
            Owner, Managers & Kitchen Staff
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#E7E1D8] gap-4">
        <button
          onClick={() => setActiveTab("info")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "info"
              ? "border-[#783F24] text-[#783F24]"
              : "border-transparent text-[#78716C] hover:text-[#29241F]"
          }`}
        >
          Restaurant Info & Branding
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "staff"
              ? "border-[#783F24] text-[#783F24]"
              : "border-transparent text-[#78716C] hover:text-[#29241F]"
          }`}
        >
          Staff & Access Credentials ({staffList?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab("subscription")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "subscription"
              ? "border-[#783F24] text-[#783F24]"
              : "border-transparent text-[#78716C] hover:text-[#29241F]"
          }`}
        >
          Plan & Table Limits
        </button>
      </div>

      {/* Success / Error Notification */}
      {formSuccessMsg && (
        <div className="p-4 rounded-2xl bg-[#557A52]/10 border border-[#557A52]/30 text-xs font-semibold text-[#557A52] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{formSuccessMsg}</span>
        </div>
      )}
      {formErrorMsg && (
        <div className="p-4 rounded-2xl bg-[#B94A48]/10 border border-[#B94A48]/30 text-xs font-semibold text-[#B94A48] flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          <span>{formErrorMsg}</span>
        </div>
      )}

      {/* TAB 1: RESTAURANT INFO & BRANDING */}
      {activeTab === "info" && (
        <div className="rounded-3xl bg-white border border-[#E7E1D8] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#FAF8F4]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
                Restaurant Details & Contacts
              </h2>
              <p className="text-xs text-[#78716C]">
                Update restaurant identity, URL slug, and official contacts.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              isLoading={updateDetailsMutation.isPending}
              onClick={() => updateDetailsMutation.mutate()}
            >
              <Save className="h-4 w-4 mr-1.5" />
              <span>Save Changes</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Restaurant Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="URL Slug (Unique)"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
            />

            <Input
              label="Contact Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />

            <Input
              label="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />

            <div className="sm:col-span-2">
              <Input
                label="Physical Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 12, High Street, Commercial Zone"
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Restaurant Logo URL"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & ACCESS CREDENTIALS */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
                Manage Restaurant Staff & Passwords
              </h2>
              <p className="text-xs text-[#78716C]">
                Super Admin can view, create, toggle status, and reset passwords for Owner, Managers, and Kitchen Staff.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddStaffOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              <span>Add Staff Member</span>
            </Button>
          </div>

          <div className="rounded-3xl bg-white border border-[#E7E1D8] overflow-hidden shadow-xs">
            {isStaffLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : !staffList || staffList.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#78716C]">
                No staff accounts found for this restaurant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Email</th>
                      <th className="px-5 py-3.5">Phone</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF8F4]">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-[#FAF8F4]/60 transition-colors">
                        <td className="px-5 py-4 font-bold text-[#29241F]">
                          {s.fullName}
                        </td>
                        <td className="px-5 py-4 text-[#78716C] font-mono">
                          {s.email}
                        </td>
                        <td className="px-5 py-4 text-[#78716C]">
                          {s.phone || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <Badge
                            variant={
                              s.role === "OWNER"
                                ? "primary"
                                : s.role === "MANAGER"
                                ? "secondary"
                                : "warning"
                            }
                            className="text-3xs"
                          >
                            {s.role}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-bold ${
                              s.isActive
                                ? "bg-[#557A52]/10 text-[#557A52]"
                                : "bg-[#B94A48]/10 text-[#B94A48]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                s.isActive ? "bg-[#557A52]" : "bg-[#B94A48]"
                              }`}
                            />
                            {s.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setResetTarget(s)}
                          >
                            <KeyRound className="h-3 w-3 mr-1" />
                            <span>Reset Password</span>
                          </Button>

                          <Button
                            size="sm"
                            variant={s.isActive ? "danger" : "secondary"}
                            className="h-7 text-xs px-2.5"
                            isLoading={toggleStaffStatusMutation.isPending}
                            onClick={() =>
                              toggleStaffStatusMutation.mutate({
                                staffId: s.id,
                                isActive: !s.isActive,
                              })
                            }
                          >
                            {s.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION & TABLE LIMITS */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          {/* Table Limit Card */}
          <div className="rounded-3xl bg-white border border-[#E7E1D8] p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
                Configure Maximum Allowed Tables
              </h2>
              <p className="text-xs text-[#78716C]">
                Configure table limits independently for this restaurant without hardcoding plan limits.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
              <Input
                label="Maximum Tables Allowed"
                type="number"
                min="1"
                max="200"
                value={tableLimit}
                onChange={(e) => setTableLimit(e.target.value)}
                className="w-full"
              />
              <Button
                variant="primary"
                className="sm:mt-5 shrink-0"
                isLoading={updateTableLimitMutation.isPending}
                onClick={() => updateTableLimitMutation.mutate(parseInt(tableLimit, 10) || 10)}
              >
                Update Limit
              </Button>
            </div>
          </div>

          {/* Predefined Subscription Plans */}
          <div className="rounded-3xl bg-white border border-[#E7E1D8] p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#29241F]">
                Change Subscription Plan
              </h2>
              <p className="text-xs text-[#78716C]">
                Select one of the 3 predefined plans to update or renew this restaurant.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly Plan */}
              <div
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                  plan?.code === "MONTHLY"
                    ? "border-[#783F24] ring-2 ring-[#783F24]/20 bg-[#FAF8F4]"
                    : "border-[#E7E1D8] bg-white hover:border-[#783F24]/40"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#783F24] uppercase tracking-wider">
                    Tier 1
                  </div>
                  <h3 className="text-lg font-black text-[#29241F]">Monthly Plan</h3>
                  <div className="text-2xl font-black text-[#783F24] mt-2">
                    ₹1,500 <span className="text-xs font-medium text-[#78716C]">/ month</span>
                  </div>
                  <p className="text-xs text-[#78716C] mt-2">
                    Standard monthly billing cycle with automated expiry calculation.
                  </p>
                </div>
                <Button
                  variant={plan?.code === "MONTHLY" ? "secondary" : "outline"}
                  size="sm"
                  disabled={plan?.code === "MONTHLY"}
                  isLoading={updatePlanMutation.isPending}
                  onClick={() => updatePlanMutation.mutate("MONTHLY")}
                >
                  {plan?.code === "MONTHLY" ? "Current Plan" : "Switch to Monthly"}
                </Button>
              </div>

              {/* 6-Month Plan */}
              <div
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                  plan?.code === "SIX_MONTH"
                    ? "border-[#783F24] ring-2 ring-[#783F24]/20 bg-[#FAF8F4]"
                    : "border-[#E7E1D8] bg-white hover:border-[#783F24]/40"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#B77932] uppercase tracking-wider">
                    Tier 2 (Popular)
                  </div>
                  <h3 className="text-lg font-black text-[#29241F]">6-Month Plan</h3>
                  <div className="text-2xl font-black text-[#783F24] mt-2">
                    ₹6,000 <span className="text-xs font-medium text-[#78716C]">/ 6 months</span>
                  </div>
                  <p className="text-xs text-[#78716C] mt-2">
                    Semi-annual cycle with 6 months automated validity.
                  </p>
                </div>
                <Button
                  variant={plan?.code === "SIX_MONTH" ? "secondary" : "outline"}
                  size="sm"
                  disabled={plan?.code === "SIX_MONTH"}
                  isLoading={updatePlanMutation.isPending}
                  onClick={() => updatePlanMutation.mutate("SIX_MONTH")}
                >
                  {plan?.code === "SIX_MONTH" ? "Current Plan" : "Switch to 6-Month"}
                </Button>
              </div>

              {/* Annual Plan */}
              <div
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                  plan?.code === "ANNUAL"
                    ? "border-[#783F24] ring-2 ring-[#783F24]/20 bg-[#FAF8F4]"
                    : "border-[#E7E1D8] bg-white hover:border-[#783F24]/40"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#557A52] uppercase tracking-wider">
                    Tier 3 (Best Value)
                  </div>
                  <h3 className="text-lg font-black text-[#29241F]">Annual Plan</h3>
                  <div className="text-2xl font-black text-[#783F24] mt-2">
                    ₹10,000 <span className="text-xs font-medium text-[#78716C]">/ 12 months</span>
                  </div>
                  <p className="text-xs text-[#78716C] mt-2">
                    Full 12 months validity with premier priority operations.
                  </p>
                </div>
                <Button
                  variant={plan?.code === "ANNUAL" ? "secondary" : "outline"}
                  size="sm"
                  disabled={plan?.code === "ANNUAL"}
                  isLoading={updatePlanMutation.isPending}
                  onClick={() => updatePlanMutation.mutate("ANNUAL")}
                >
                  {plan?.code === "ANNUAL" ? "Current Plan" : "Switch to Annual"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF MEMBER */}
      {isAddStaffOpen && (
        <AddStaffModal
          isOpen={isAddStaffOpen}
          onClose={() => setIsAddStaffOpen(false)}
          restaurantId={restaurantId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["adminRestaurantStaff", restaurantId] });
            setIsAddStaffOpen(false);
          }}
        />
      )}

      {/* MODAL: RESET STAFF PASSWORD */}
      {resetTarget && (
        <ResetPasswordModal
          isOpen={true}
          onClose={() => setResetTarget(null)}
          staffMember={resetTarget}
          restaurantId={restaurantId}
          onSuccess={() => {
            setResetTarget(null);
            setFormSuccessMsg(`Password for ${resetTarget.email} was reset successfully!`);
            setTimeout(() => setFormSuccessMsg(null), 4000);
          }}
        />
      )}
    </div>
  );
}

// Modal to Add Staff
function AddStaffModal({
  isOpen,
  onClose,
  restaurantId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"OWNER" | "MANAGER" | "KITCHEN">("MANAGER");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.createStaff(restaurantId, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        role,
      }),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to create staff account");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setErrorMsg("Full name, email, and password are required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Add Staff Account (Super Admin)" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Full Name"
          placeholder="e.g. Rahul Sharma"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="staff@restaurant.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Phone Number (Optional)"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Input
          label="Initial Password"
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">Assigned Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
          >
            <option value="MANAGER">Restaurant Manager (Full Floor & Orders)</option>
            <option value="KITCHEN">Kitchen Staff (KDS Queue & Cooking Status)</option>
            <option value="OWNER">Restaurant Owner (Full Tenant Control)</option>
          </select>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#B94A48]/10 border border-[#B94A48]/30 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={mutation.isPending}>
            Create Account
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Modal to Reset Password
function ResetPasswordModal({
  isOpen,
  onClose,
  staffMember,
  restaurantId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  staffMember: RestaurantStaffMember;
  restaurantId: string;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.resetStaffPassword(restaurantId, staffMember.id, newPassword),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to reset password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={`Reset Password for ${staffMember.fullName}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] text-xs text-[#78716C] space-y-1">
          <div>
            <span className="font-semibold text-[#29241F]">Account:</span> {staffMember.email}
          </div>
          <div>
            <span className="font-semibold text-[#29241F]">Role:</span> {staffMember.role}
          </div>
        </div>

        <Input
          label="New Password"
          type="password"
          placeholder="Enter new secure password (min 8 chars)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#B94A48]/10 border border-[#B94A48]/30 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={mutation.isPending}>
            Confirm New Password
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
