"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  Check,
  XCircle,
  Phone,
  RefreshCw,
  Utensils,
  Receipt,
  Sparkles,
} from "lucide-react";
import { publicApi, PublicOrderStatusResponse } from "@/services/api/public.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STEPS = [
  { key: "PENDING", label: "Order Placed", desc: "Sent to kitchen", icon: Clock },
  { key: "ACCEPTED", label: "Confirmed", desc: "Chef reviewed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing", desc: "Cooking your meal", icon: ChefHat },
  { key: "READY", label: "Ready", desc: "Ready for you", icon: BellRing },
  { key: "COMPLETED", label: "Served", desc: "Order complete", icon: Check },
];

function TrackingLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] p-4 sm:p-6 max-w-lg mx-auto space-y-4">
      <Skeleton className="h-10 w-48 rounded-xl mx-auto" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ trackingToken: string }>;
}) {
  return (
    <React.Suspense fallback={<TrackingLoadingSkeleton />}>
      <OrderTrackingContent paramsPromise={params} />
    </React.Suspense>
  );
}

function OrderTrackingContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ trackingToken: string }>;
}) {
  const { trackingToken } = React.use(paramsPromise);

  const [order, setOrder] = React.useState<PublicOrderStatusResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchOrder = React.useCallback(async (showRefreshing = false) => {
    if (!trackingToken) return;
    if (showRefreshing) setIsRefreshing(true);

    try {
      const data = await publicApi.getOrderByTrackingToken(trackingToken);
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load order";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [trackingToken]);

  // Initial fetch
  React.useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Document-visibility aware polling (every 6 seconds while active)
  React.useEffect(() => {
    if (!order) return;
    const isTerminal =
      order.order_status === "COMPLETED" ||
      order.order_status === "CANCELLED" ||
      order.order_status === "REJECTED";

    if (isTerminal) return; // Stop polling on terminal states

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === "visible") {
            fetchOrder();
          }
        }, 6000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrder();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [order, fetchOrder]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] p-4 sm:p-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl mx-auto" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E7E1D8] text-center shadow-lg space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-[#B94A48]/10 text-[#B94A48] flex items-center justify-center mx-auto">
            <XCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-[#29241F]">Order Not Found</h1>
          <p className="text-sm text-[#78716C]">
            {error || "Could not retrieve order details. Please check your link or ask a staff member."}
          </p>
          <Button onClick={() => fetchOrder(true)} className="w-full">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isCancelled = order.order_status === "CANCELLED" || order.order_status === "REJECTED";
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.order_status);

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-4 sm:p-6 max-w-lg mx-auto text-[#29241F] space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Live Order Status
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Order #{order.order_number}
          </h1>
        </div>
        <button
          onClick={() => fetchOrder(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E1D8] bg-white text-xs font-medium text-[#78716C] hover:text-[#29241F] cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#783F24]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Status Hero Card */}
      <div className="rounded-3xl bg-white border border-[#E7E1D8] p-5 sm:p-6 shadow-xs space-y-6">
        {/* Table & Pickup Info */}
        <div className="flex items-center justify-between border-b border-[#FAF8F4] pb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#F3E6D4] text-[#783F24] flex items-center justify-center">
              <Utensils className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#29241F]">
                {order.table?.label || "Counter Pickup"}
              </p>
              <p className="text-2xs text-[#78716C]">
                {order.restaurant?.name}
              </p>
            </div>
          </div>

          <Badge
            variant={
              order.payment_status === "PAID"
                ? "success"
                : order.payment_status === "REFUNDED"
                ? "secondary"
                : "warning"
            }
          >
            {order.payment_status === "PAID" ? "Paid" : "Payment Pending"}
          </Badge>
        </div>

        {/* Cancellation Notice */}
        {isCancelled ? (
          <div className="rounded-2xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-4 text-center space-y-1">
            <p className="text-sm font-bold text-[#B94A48]">
              {order.order_status === "REJECTED" ? "Order Rejected by Restaurant" : "Order Cancelled"}
            </p>
            <p className="text-xs text-[#78716C]">
              Please speak with staff at the counter or your table for assistance.
            </p>
          </div>
        ) : (
          /* Live Stepper */
          <div className="space-y-4">
            <div className="relative flex justify-between">
              {/* Connector Bar */}
              <div className="absolute top-4 left-3 right-3 h-0.5 bg-[#E7E1D8] -z-0" />
              <div
                className="absolute top-4 left-3 h-0.5 bg-[#783F24] transition-all duration-500 -z-0"
                style={{
                  width: `${Math.max(0, Math.min(100, (currentIndex / (STATUS_STEPS.length - 1)) * 100))}%`,
                }}
              />

              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center z-10">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-[#783F24] text-white ring-4 ring-[#F3E6D4] shadow-sm animate-pulse"
                          : isPassed
                          ? "bg-[#783F24] text-white"
                          : "bg-white border border-[#E7E1D8] text-[#A8A29E]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-2xs font-semibold mt-2 ${
                        isCurrent
                          ? "text-[#783F24]"
                          : isPassed
                          ? "text-[#29241F]"
                          : "text-[#A8A29E]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Step Explanation */}
            <div className="rounded-2xl bg-[#FAF8F4] border border-[#E7E1D8] p-4 text-center mt-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#783F24]">
                <Sparkles className="h-3.5 w-3.5 text-[#C58B45]" />
                <span>
                  {order.order_status === "PENDING" && "Your order is being reviewed by the kitchen."}
                  {order.order_status === "ACCEPTED" && "Order accepted! Chefs are lining up your ingredients."}
                  {order.order_status === "PREPARING" && "Your food is sizzling in the kitchen right now."}
                  {order.order_status === "READY" &&
                    (order.restaurant?.ordering_mode === "SELF_SERVICE"
                      ? "🔔 Order is READY! Please pick it up at the counter."
                      : "🔔 Order is READY! Your server is bringing it to your table.")}
                  {order.order_status === "COMPLETED" && "Order completed! Enjoy your meal."}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Items Breakdown */}
      <div className="rounded-3xl bg-white border border-[#E7E1D8] p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#FAF8F4] pb-3">
          <Receipt className="h-4 w-4 text-[#783F24]" />
          <h2 className="text-sm font-bold text-[#29241F]">Order Receipt</h2>
        </div>

        <div className="divide-y divide-[#FAF8F4]">
          {order.items?.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-[#FAF8F4] border border-[#E7E1D8] font-bold text-[#783F24] flex items-center justify-center text-xs">
                  {item.quantity}×
                </span>
                <span className="font-medium text-[#29241F]">
                  {item.item_name_snapshot}
                </span>
              </div>
              <span className="font-semibold text-[#29241F]">
                {formatPaiseToINR(item.line_total_paise)}
              </span>
            </div>
          ))}
        </div>

        {/* Financial Totals */}
        <div className="border-t border-[#E7E1D8] pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-[#78716C]">
            <span>Subtotal</span>
            <span>{formatPaiseToINR(order.subtotal_paise)}</span>
          </div>
          {order.tax_paise > 0 && (
            <div className="flex justify-between text-[#78716C]">
              <span>Taxes (GST)</span>
              <span>{formatPaiseToINR(order.tax_paise)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm sm:text-base font-bold text-[#29241F] pt-2 border-t border-[#FAF8F4]">
            <span>Grand Total</span>
            <span className="text-[#783F24]">
              {formatPaiseToINR(order.total_paise)}
            </span>
          </div>
        </div>
      </div>

      {/* Restaurant Assistance Footer */}
      {order.restaurant?.phone && (
        <div className="text-center text-xs text-[#78716C] pt-2">
          <span>Need help with your order? </span>
          <a
            href={`tel:${order.restaurant.phone}`}
            className="inline-flex items-center gap-1 font-semibold text-[#783F24] hover:underline"
          >
            <Phone className="h-3 w-3" />
            <span>Call Restaurant ({order.restaurant.phone})</span>
          </a>
        </div>
      )}
    </div>
  );
}
