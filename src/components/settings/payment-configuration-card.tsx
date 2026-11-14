"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  QrCode,
  Store,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { restaurantApi } from "@/services/api/restaurant.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantPaymentConfig } from "@/types/payment-config.types";

interface PaymentConfigurationCardProps {
  restaurantId: string;
  isSuperAdminView?: boolean;
}

export function PaymentConfigurationCard({
  restaurantId,
  isSuperAdminView = false,
}: PaymentConfigurationCardProps) {
  const queryClient = useQueryClient();

  // Form State
  const [acceptCounter, setAcceptCounter] = React.useState(true);
  const [acceptRazorpay, setAcceptRazorpay] = React.useState(false);
  const [acceptUpi, setAcceptUpi] = React.useState(false);
  const [payPolicy, setPayPolicy] = React.useState<"PAY_FIRST" | "PAY_LATER">("PAY_LATER");

  const [razorpayKeyId, setRazorpayKeyId] = React.useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = React.useState("");
  const [showKeySecret, setShowKeySecret] = React.useState(false);

  const [upiId, setUpiId] = React.useState("");
  const [upiName, setUpiName] = React.useState("");

  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Fetch current payment config
  const { data: config, isLoading } = useQuery<RestaurantPaymentConfig>({
    queryKey: ["paymentConfig", restaurantId],
    queryFn: () => restaurantApi.getPaymentConfig(restaurantId),
    enabled: !!restaurantId,
  });

  // Populate state on load
  React.useEffect(() => {
    if (config) {
      setAcceptCounter(config.acceptCounter);
      setAcceptRazorpay(config.acceptRazorpay);
      setAcceptUpi(config.acceptUpi);
      setPayPolicy(config.payPolicy || "PAY_LATER");
      setRazorpayKeyId(config.razorpayKeyId || "");
      setRazorpayKeySecret(config.razorpayKeySecret || "");
      setUpiId(config.upiId || "");
      setUpiName(config.upiName || "");
    }
  }, [config]);

  // Mutation
  const mutation = useMutation({
    mutationFn: (customPayload?: Partial<RestaurantPaymentConfig>) => {
      const payload = {
        acceptCounter,
        acceptRazorpay,
        acceptUpi,
        payPolicy,
        razorpayKeyId: razorpayKeyId.trim() || null,
        razorpayKeySecret: razorpayKeySecret.trim() || null,
        upiId: upiId.trim() || null,
        upiName: upiName.trim() || null,
        ...customPayload,
      };

      if (!payload.acceptCounter && !payload.acceptRazorpay && !payload.acceptUpi) {
        throw new Error("At least one payment option (Pay at counter, Razorpay, or UPI) must be enabled.");
      }

      if (payload.acceptRazorpay && !payload.razorpayKeyId) {
        throw new Error("Razorpay Key ID is required when Razorpay is enabled.");
      }

      if (payload.acceptUpi && !payload.upiId) {
        throw new Error("UPI ID is required when Pay by UPI is enabled.");
      }

      if (payload.payPolicy === "PAY_FIRST" && !payload.acceptRazorpay && !payload.acceptUpi && !payload.acceptCounter) {
        throw new Error("Please enable at least one payment method for Pay First orders.");
      }

      return restaurantApi.updatePaymentConfig(restaurantId, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["paymentConfig", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["publicMenu"] });
      setSuccessMsg("Payment configuration saved successfully!");
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update payment configuration.");
      setSuccessMsg(null);
    },
  });

  // Dedicated Save buttons
  const handleSaveRazorpay = (e: React.FormEvent) => {
    e.preventDefault();
    if (acceptRazorpay && !razorpayKeyId.trim()) {
      setErrorMsg("Please enter your Razorpay Key ID.");
      return;
    }
    mutation.mutate({
      razorpayKeyId: razorpayKeyId.trim() || null,
      razorpayKeySecret: razorpayKeySecret.trim() || null,
    });
  };

  const handleSaveUpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (acceptUpi && !upiId.trim()) {
      setErrorMsg("Please enter your UPI ID.");
      return;
    }
    mutation.mutate({
      upiId: upiId.trim() || null,
      upiName: upiName.trim() || null,
    });
  };

  // Diners preview label
  const activeModesSummary = React.useMemo(() => {
    const list: string[] = [];
    if (acceptCounter) list.push("Pay at the Counter");
    if (acceptRazorpay) list.push("Pay now online (Razorpay)");
    if (acceptUpi) list.push("Pay by UPI");
    return list.length > 0 ? list.join(", ") : "None enabled";
  }, [acceptCounter, acceptRazorpay, acceptUpi]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-60 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-[#29241F]">Payment Configuration</h2>
        <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
          Choose how diners can pay for their orders and configure your payment gateway and UPI accounts.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-[#557A52]/30 bg-[#557A52]/10 p-3.5 text-xs text-[#557A52] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3.5 text-xs text-[#B94A48] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Card 1: How Diners Can Pay */}
      <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
          <Store className="h-4 w-4 text-[#783F24]" />
          <div>
            <h3 className="text-sm font-bold text-[#29241F]">How diners can pay</h3>
            <p className="text-2xs text-[#78716C]">
              Switch each option on or off. Diners only see the ones that are on.
            </p>
          </div>
        </div>

        {/* Payment Toggles */}
        <div className="space-y-3 divide-y divide-[#FAF8F4]">
          {/* Toggle 1: Pay at the counter */}
          <div className="pt-3 first:pt-0 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#29241F] block">
                Pay at the counter
              </span>
              <p className="text-xs text-[#78716C]">
                Diners order now and pay your staff by cash, card machine or UPI. The kitchen sees &apos;Pay at counter&apos;.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={acceptCounter}
                onChange={(e) => {
                  const val = e.target.checked;
                  if (!val && !acceptRazorpay && !acceptUpi) {
                    setErrorMsg("At least one payment option must be turned on.");
                    return;
                  }
                  setAcceptCounter(val);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E7E1D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#783F24]"></div>
            </label>
          </div>

          {/* Toggle 2: Pay now online (Razorpay) */}
          <div className="pt-3 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#29241F] block">
                Pay now online (Razorpay)
              </span>
              <p className="text-xs text-[#78716C]">
                UPI, cards, netbanking and wallets, straight into your Razorpay account. The kitchen sees &apos;Paid online&apos;. Connect Razorpay below to use this.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={acceptRazorpay}
                onChange={(e) => {
                  const val = e.target.checked;
                  if (!val && !acceptCounter && !acceptUpi) {
                    setErrorMsg("At least one payment option must be turned on.");
                    return;
                  }
                  setAcceptRazorpay(val);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E7E1D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#783F24]"></div>
            </label>
          </div>

          {/* Toggle 3: Pay by UPI */}
          <div className="pt-3 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-[#29241F] block">
                Pay by UPI
              </span>
              <p className="text-xs text-[#78716C]">
                The diner&apos;s UPI app opens with your UPI ID and the exact bill filled in. Money goes straight to your bank, no fee. Staff tap &apos;Mark paid&apos; once it arrives. Add your UPI ID below to use this.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={acceptUpi}
                onChange={(e) => {
                  const val = e.target.checked;
                  if (!val && !acceptCounter && !acceptRazorpay) {
                    setErrorMsg("At least one payment option must be turned on.");
                    return;
                  }
                  setAcceptUpi(val);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E7E1D8] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#783F24]"></div>
            </label>
          </div>
        </div>

        {/* Live Preview Indicator */}
        <div className="pt-2 border-t border-[#FAF8F4] flex items-center justify-between text-2xs">
          <span className="text-[#78716C]">
            Diners see: <strong className="text-[#29241F] font-semibold">{activeModesSummary}</strong>
          </span>
          <Button
            size="sm"
            variant="outline"
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save Options
          </Button>
        </div>
      </div>

      {/* Card 2: Pay First vs Pay Later Policy */}
      <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
          <Clock className="h-4 w-4 text-[#783F24]" />
          <div>
            <h3 className="text-sm font-bold text-[#29241F]">Order Payment Timing</h3>
            <p className="text-2xs text-[#78716C]">
              Decide whether customers pay before their order is confirmed or settle up later.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option A: Pay Later */}
          <label
            onClick={() => setPayPolicy("PAY_LATER")}
            className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              payPolicy === "PAY_LATER"
                ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#29241F]">
                  Pay Later (Dine & Pay Later)
                </span>
                <span className="h-4 w-4 rounded-full border border-[#783F24] flex items-center justify-center">
                  {payPolicy === "PAY_LATER" && (
                    <span className="h-2 w-2 rounded-full bg-[#783F24]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-1.5 leading-relaxed">
                Diners order first, food starts cooking immediately, and they settle the bill at the counter or with staff when leaving.
              </p>
            </div>
            <span className="text-3xs font-semibold text-[#783F24] mt-2 block">
              Standard Restaurant Dine-in
            </span>
          </label>

          {/* Option B: Pay First */}
          <label
            onClick={() => setPayPolicy("PAY_FIRST")}
            className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              payPolicy === "PAY_FIRST"
                ? "border-[#783F24] bg-[#F3E6D4]/30 ring-1 ring-[#783F24]"
                : "border-[#E7E1D8] bg-white hover:bg-[#FAF8F4]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#29241F]">
                  Pay First (Prepaid Ordering)
                </span>
                <span className="h-4 w-4 rounded-full border border-[#783F24] flex items-center justify-center">
                  {payPolicy === "PAY_FIRST" && (
                    <span className="h-2 w-2 rounded-full bg-[#783F24]" />
                  )}
                </span>
              </div>
              <p className="text-xs text-[#78716C] mt-1.5 leading-relaxed">
                Diners must complete their payment (via Razorpay or UPI) when placing the order before it is accepted and sent to the kitchen.
              </p>
            </div>
            <span className="text-3xs font-semibold text-[#557A52] mt-2 block">
              Best for Cafes, Food Courts & Takeaway
            </span>
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="outline"
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Update Timing Policy
          </Button>
        </div>
      </div>

      {/* Card 3 & 4: Side-by-Side Account Config (Razorpay & UPI) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Razorpay Gateway Card */}
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
              <CreditCard className="h-4 w-4 text-[#783F24]" />
              <h3 className="text-sm font-bold text-[#29241F]">Razorpay</h3>
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed">
              UPI, cards, netbanking and wallets. Money goes straight to your own Razorpay account.
            </p>

            <div className="rounded-xl bg-[#FAF8F4] p-3 text-2xs text-[#78716C] leading-normal border border-[#E7E1D8]/60">
              In the Razorpay dashboard open <strong>Account & Settings → API Keys</strong> and generate a key. The secret is stored encrypted and can&apos;t be viewed again here.
            </div>

            <div className="space-y-3">
              <Input
                label="Key Id"
                placeholder="rzp_live_xxxxxxxxxxxx"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#29241F]">Key Secret</label>
                <div className="relative">
                  <input
                    type={showKeySecret ? "text" : "password"}
                    placeholder="••••••••••••••••"
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-[#E7E1D8] bg-white px-3.5 py-2 pr-10 text-xs sm:text-sm text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeySecret(!showKeySecret)}
                    className="absolute right-3 top-2.5 text-[#78716C] hover:text-[#29241F] cursor-pointer"
                  >
                    {showKeySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full mt-4"
            isLoading={mutation.isPending}
            onClick={handleSaveRazorpay}
          >
            Save Razorpay Keys
          </Button>
        </div>

        {/* UPI Direct Card */}
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
              <QrCode className="h-4 w-4 text-[#783F24]" />
              <h3 className="text-sm font-bold text-[#29241F]">UPI</h3>
            </div>

            <p className="text-xs text-[#78716C] leading-relaxed">
              Diners pay your UPI ID directly. No fee, no sign-up. Use the UPI ID your bank or UPI app gives you.
            </p>

            <div className="space-y-3">
              <Input
                label="UPI ID"
                placeholder="restaurant@okicici"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />

              <Input
                label="Name shown in the UPI app"
                placeholder="Your restaurant's name"
                value={upiName}
                onChange={(e) => setUpiName(e.target.value)}
              />
            </div>

            <p className="text-3xs text-[#78716C] leading-normal pt-1">
              Check the UPI ID carefully: diners&apos; money goes wherever it points. Pay yourself ₹1 from your own phone to test it.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full mt-4"
            isLoading={mutation.isPending}
            onClick={handleSaveUpi}
          >
            Save UPI details
          </Button>
        </div>
      </div>
    </div>
  );
}

