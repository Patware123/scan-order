"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ChefHat,
  Crown,
  CheckCircle2,
  Phone,
  KeyRound,
  ExternalLink,
  Copy,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface StaffItem {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: "OWNER" | "MANAGER" | "KITCHEN";
  isActive: boolean;
  createdAt: string;
}

export default function StaffManagementPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId, role } = useAuth();

  const [activeTab, setActiveTab] = React.useState<"ALL" | "MANAGER" | "KITCHEN">("ALL");
  const [createModalRole, setCreateModalRole] = React.useState<"MANAGER" | "KITCHEN" | null>(null);
  const [kitchenSuccessModal, setKitchenSuccessModal] = React.useState<{
    name: string;
    email: string;
  } | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = React.useState<StaffItem | null>(null);
  const [toggleStatusTarget, setToggleStatusTarget] = React.useState<StaffItem | null>(null);

  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  const { data: staffList, isLoading } = useQuery<StaffItem[]>({
    queryKey: ["staff", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? (restaurantApi.getStaff(activeRestaurantId) as any) : []),
    enabled: !!activeRestaurantId,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      restaurantApi.updateStaffStatus(activeRestaurantId!, userId, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["staff", activeRestaurantId] });
      setToggleStatusTarget(null);
      setSuccessMsg(`Staff member ${vars.isActive ? "activated" : "deactivated"} successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  const isOwner = role === "OWNER" || role === "SUPER_ADMIN";
  const kitchenDashboardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/kitchen`
      : "/dashboard/kitchen";

  const filteredStaff = (staffList || []).filter((s) => {
    if (activeTab === "ALL") return true;
    return s.role === activeTab;
  });

  const managerCount = (staffList || []).filter((s) => s.role === "MANAGER").length;
  const kitchenCount = (staffList || []).filter((s) => s.role === "KITCHEN").length;

  const handleCopyKitchenUrl = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(kitchenDashboardUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Team & Access Control
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Staff & Employee Management
          </h1>
          <p className="text-xs text-[#78716C] mt-0.5">
            Manage individual accounts for restaurant managers and kitchen chefs.
          </p>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateModalRole("MANAGER")}
              className="border-[#783F24] text-[#783F24] hover:bg-[#783F24]/5"
            >
              <Shield className="h-4 w-4 mr-1.5" />
              <span>Create Manager</span>
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setCreateModalRole("KITCHEN")}
            >
              <ChefHat className="h-4 w-4 mr-1.5" />
              <span>Create Kitchen Staff</span>
            </Button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="rounded-xl border border-[#557A52]/30 bg-[#557A52]/10 p-3.5 text-xs text-[#557A52] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab("ALL")}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            activeTab === "ALL"
              ? "border-[#783F24] bg-[#783F24]/5 ring-1 ring-[#783F24]"
              : "border-[#E7E1D8] bg-white hover:border-[#783F24]/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
              Total Staff
            </span>
            <Users className="h-4 w-4 text-[#783F24]" />
          </div>
          <div className="text-2xl font-black text-[#29241F] mt-1">
            {staffList?.length || 0}
          </div>
          <p className="text-3xs text-[#78716C] mt-0.5">All active & assigned accounts</p>
        </div>

        <div
          onClick={() => setActiveTab("MANAGER")}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            activeTab === "MANAGER"
              ? "border-[#783F24] bg-[#783F24]/5 ring-1 ring-[#783F24]"
              : "border-[#E7E1D8] bg-white hover:border-[#783F24]/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
              Restaurant Managers
            </span>
            <Shield className="h-4 w-4 text-[#783F24]" />
          </div>
          <div className="text-2xl font-black text-[#783F24] mt-1">{managerCount}</div>
          <p className="text-3xs text-[#78716C] mt-0.5">Order approval & floor ops</p>
        </div>

        <div
          onClick={() => setActiveTab("KITCHEN")}
          className={`rounded-2xl border p-4 cursor-pointer transition-all ${
            activeTab === "KITCHEN"
              ? "border-[#557A52] bg-[#557A52]/5 ring-1 ring-[#557A52]"
              : "border-[#E7E1D8] bg-white hover:border-[#557A52]/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
              Kitchen Chefs
            </span>
            <ChefHat className="h-4 w-4 text-[#557A52]" />
          </div>
          <div className="text-2xl font-black text-[#557A52] mt-1">{kitchenCount}</div>
          <p className="text-3xs text-[#78716C] mt-0.5">Individual KDS ticket accounts</p>
        </div>
      </div>

      {/* Staff Listing */}
      <div className="rounded-2xl border border-[#E7E1D8] bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-8 w-8 text-[#78716C] mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-[#29241F]">No Staff Accounts Found</h3>
            <p className="text-xs text-[#78716C] max-w-sm mx-auto">
              Create individual accounts for your restaurant managers or kitchen chefs to begin operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8F4]">
                {filteredStaff.map((member) => {
                  const isOwnerMember = member.role === "OWNER";

                  return (
                    <tr key={member.id} className="hover:bg-[#FAF8F4] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              member.role === "OWNER"
                                ? "bg-[#C58B45]/15 text-[#C58B45]"
                                : member.role === "MANAGER"
                                ? "bg-[#783F24]/10 text-[#783F24]"
                                : "bg-[#557A52]/10 text-[#557A52]"
                            }`}
                          >
                            {member.role === "OWNER" ? (
                              <Crown className="h-4 w-4" />
                            ) : member.role === "MANAGER" ? (
                              <Shield className="h-4 w-4" />
                            ) : (
                              <ChefHat className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#29241F] text-sm truncate">
                              {member.fullName}
                            </div>
                            <div className="text-3xs text-[#78716C]">
                              Created {new Date(member.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-[#78716C] space-y-0.5">
                        <div className="flex items-center gap-1 truncate max-w-[180px]">
                          <Mail className="h-3 w-3 text-[#78716C] shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-[#78716C] shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            member.role === "OWNER"
                              ? "warning"
                              : member.role === "MANAGER"
                              ? "primary"
                              : "success"
                          }
                        >
                          {member.role === "KITCHEN" ? "Kitchen Staff" : member.role}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant={member.isActive ? "success" : "danger"}>
                          {member.isActive ? "Active" : "Deactivated"}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right space-x-2">
                        {isOwner && !isOwnerMember && (
                          <>
                            <button
                              onClick={() => setResetPasswordTarget(member)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#E7E1D8] text-[#29241F] hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              Reset Pass
                            </button>

                            <button
                              onClick={() => setToggleStatusTarget(member)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                member.isActive
                                  ? "border border-[#B94A48]/30 text-[#B94A48] hover:bg-[#B94A48]/10"
                                  : "border border-[#557A52]/30 text-[#557A52] hover:bg-[#557A52]/10"
                              }`}
                            >
                              {member.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      {createModalRole && (
        <CreateStaffAccountModal
          role={createModalRole}
          restaurantId={activeRestaurantId}
          onClose={() => setCreateModalRole(null)}
          onSuccess={(staff) => {
            queryClient.invalidateQueries({ queryKey: ["staff", activeRestaurantId] });
            setCreateModalRole(null);
            if (staff.role === "KITCHEN") {
              setKitchenSuccessModal({ name: staff.fullName, email: staff.email });
            } else {
              setSuccessMsg(`Manager account created for ${staff.email}!`);
              setTimeout(() => setSuccessMsg(null), 4000);
            }
          }}
        />
      )}

      {/* Kitchen Staff Success Confirmation Modal */}
      {kitchenSuccessModal && (
        <Dialog
          isOpen={true}
          onClose={() => setKitchenSuccessModal(null)}
          title="Kitchen Staff Account Created!"
          size="md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="rounded-2xl border border-[#557A52]/30 bg-[#557A52]/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#557A52] font-bold text-sm">
                <ChefHat className="h-5 w-5 shrink-0" />
                <span>Individual Kitchen Account Ready</span>
              </div>
              <p className="text-[#29241F]">
                An individual account for <strong>{kitchenSuccessModal.name}</strong> ({kitchenSuccessModal.email}) has been provisioned.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E1D8] bg-[#FAF8F4] p-4 space-y-3">
              <span className="font-bold text-[#29241F] text-xs block">
                Dedicated Kitchen Display System (KDS) Instructions
              </span>

              <p className="text-[#78716C] leading-relaxed">
                1. Kitchen staff member should open the application and log in with their individual email (<strong>{kitchenSuccessModal.email}</strong>) and initial password.
              </p>

              <p className="text-[#78716C] leading-relaxed">
                2. After login, they can open the live Kitchen Dashboard URL below on the kitchen tablet or monitor to view incoming orders, table numbers, item quantities, and order age:
              </p>

              <div className="rounded-xl border border-[#E7E1D8] bg-white p-2.5 flex items-center justify-between gap-2">
                <span className="font-mono text-2xs text-[#783F24] truncate">
                  {kitchenDashboardUrl}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyKitchenUrl}
                  className="shrink-0 h-8 text-2xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  <span>{copiedUrl ? "Copied!" : "Copy URL"}</span>
                </Button>
              </div>

              <p className="text-3xs text-[#78716C]">
                * Security note: The kitchen URL is strictly authenticated and authorized by the backend. Staff can only access this restaurant&apos;s kitchen queue.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setKitchenSuccessModal(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <ResetPasswordModal
          staff={resetPasswordTarget}
          restaurantId={activeRestaurantId}
          onClose={() => setResetPasswordTarget(null)}
          onSuccess={() => {
            setResetPasswordTarget(null);
            setSuccessMsg("Staff member password reset successfully!");
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}

      {/* Deactivate/Activate Confirmation */}
      {toggleStatusTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setToggleStatusTarget(null)}
          onConfirm={() =>
            toggleStatusMutation.mutate({
              userId: toggleStatusTarget.userId,
              isActive: !toggleStatusTarget.isActive,
            })
          }
          title={`${toggleStatusTarget.isActive ? "Deactivate" : "Activate"} Staff Member?`}
          message={
            toggleStatusTarget.isActive
              ? `Deactivating ${toggleStatusTarget.fullName} (${toggleStatusTarget.email}) will immediately revoke their access to this restaurant.`
              : `Activating ${toggleStatusTarget.fullName} will restore their login access.`
          }
          confirmLabel={toggleStatusTarget.isActive ? "Deactivate" : "Activate"}
          variant={toggleStatusTarget.isActive ? "danger" : "primary"}
          isLoading={toggleStatusMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateStaffAccountModal({
  role,
  restaurantId,
  onClose,
  onSuccess,
}: {
  role: "MANAGER" | "KITCHEN";
  restaurantId: string;
  onClose: () => void;
  onSuccess: (staff: StaffItem) => void;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.createStaff(restaurantId, {
        fullName,
        email,
        phone: phone || undefined,
        password,
        role,
      }),
    onSuccess: (data: any) => {
      onSuccess(data);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to create staff account.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }
    if (!password || password.length < 8) {
      setErrorMsg("Initial password must be at least 8 characters.");
      return;
    }

    mutation.mutate();
  };

  const isKitchen = role === "KITCHEN";

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={isKitchen ? "Create Kitchen Staff Account" : "Create Restaurant Manager Account"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] p-3 text-xs text-[#78716C] flex items-center gap-2">
          {isKitchen ? (
            <ChefHat className="h-5 w-5 text-[#557A52] shrink-0" />
          ) : (
            <Shield className="h-5 w-5 text-[#783F24] shrink-0" />
          )}
          <span>
            {isKitchen
              ? "Kitchen staff can log in with their own credentials to view incoming orders and update preparation status on the Kitchen Display System (KDS)."
              : "Managers have full floor operations access: accepting/rejecting orders, updating tables, and managing item availability."}
          </span>
        </div>

        <Input
          label={isKitchen ? "Staff / Chef Name" : "Manager Full Name"}
          placeholder="e.g. Rahul Sharma"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Email Address (Login ID)"
            type="email"
            placeholder={isKitchen ? "chef@restaurant.com" : "manager@restaurant.com"}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="+91 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="relative">
          <Input
            label="Initial Password (Min 8 Characters)"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="The staff member will use this password to sign in at /login"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-[#78716C] hover:text-[#29241F]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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
            {isKitchen ? "Create Kitchen Account" : "Create Manager Account"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordModal({
  staff,
  restaurantId,
  onClose,
  onSuccess,
}: {
  staff: StaffItem;
  restaurantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.resetStaffPassword(restaurantId, staff.userId, newPassword),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to reset password.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog isOpen={true} onClose={onClose} title={`Reset Password — ${staff.fullName}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <p className="text-xs text-[#78716C]">
          Set a new initial password for <strong>{staff.fullName}</strong> ({staff.email}). They will be able to log in immediately with the new password.
        </p>

        <div className="relative">
          <Input
            label="New Password (Min 8 Characters)"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-[#78716C] hover:text-[#29241F]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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
            Update Password
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
