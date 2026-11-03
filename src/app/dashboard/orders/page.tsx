"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  Check,
  XCircle,
  CreditCard,
  User,
  Phone,
  AlertTriangle,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi, RestaurantOrder } from "@/services/api/restaurant.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type StatusTab = "ALL" | "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED";

function getElapsedTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function LiveOrdersPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId } = useAuth();

  const [activeTab, setActiveTab] = React.useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Reject Modal State
  const [rejectOrder, setRejectOrder] = React.useState<RestaurantOrder | null>(null);
  const [rejectReason, setRejectReason] = React.useState("Kitchen busy / item out of stock");

  // Payment Modal State
  const [settleOrder, setSettleOrder] = React.useState<RestaurantOrder | null>(null);

  // Fetch orders with visibility-throttled polling (every 6 seconds)
  const { data: orders, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["restaurantOrders", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getOrders(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
    refetchInterval: 6000,
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      reason,
    }: {
      orderId: string;
      status: RestaurantOrder["order_status"];
      reason?: string;
    }) =>
      restaurantApi.updateOrderStatus(activeRestaurantId!, orderId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", activeRestaurantId] });
      setRejectOrder(null);
    },
  });

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: ({ orderId, paymentStatus }: { orderId: string; paymentStatus: "PAID" | "UNPAID" }) =>
      restaurantApi.updatePaymentStatus(activeRestaurantId!, orderId, paymentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", activeRestaurantId] });
      setSettleOrder(null);
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  // Filter orders
  const filteredOrders = (orders || []).filter((order) => {
    if (activeTab !== "ALL" && order.order_status !== activeTab) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = order.order_number.toLowerCase().includes(q);
      const matchName = order.customer_name?.toLowerCase().includes(q);
      const tableLabel =
        order.table?.label ||
        (order as unknown as { restaurant_tables?: { table_number?: string } })?.restaurant_tables?.table_number ||
        "";
      const matchTable = tableLabel.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchTable) return false;
    }
    return true;
  });

  const pendingCount = (orders || []).filter((o) => o.order_status === "PENDING").length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Order Management
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F] flex items-center gap-2">
            <span>Live Orders Queue</span>
            {pendingCount > 0 && (
              <span className="h-6 px-2 rounded-full bg-[#B77932] text-white text-xs font-bold flex items-center justify-center animate-pulse">
                {pendingCount} New
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E7E1D8] bg-white text-xs font-semibold text-[#78716C] hover:text-[#29241F] cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-[#783F24]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(["ALL", "PENDING", "ACCEPTED", "PREPARING", "READY", "COMPLETED"] as StatusTab[]).map(
            (tab) => {
              const count =
                tab === "ALL"
                  ? orders?.length || 0
                  : orders?.filter((o) => o.order_status === tab).length || 0;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === tab
                      ? "bg-[#783F24] text-white shadow-2xs"
                      : "bg-white text-[#78716C] border border-[#E7E1D8] hover:bg-[#FAF8F4]"
                  }`}
                >
                  <span>{tab === "ALL" ? "All Orders" : tab}</span>
                  <span
                    className={`text-3xs px-1.5 py-0.2 rounded-full ${
                      activeTab === tab
                        ? "bg-white/20 text-white"
                        : "bg-[#FAF8F4] text-[#78716C]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search order #, table, guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-xl border border-[#E7E1D8] bg-white pl-8 pr-3 text-xs text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-[#557A52] mx-auto" />
          <h3 className="text-sm font-bold text-[#29241F]">No Orders in This Queue</h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            {activeTab === "PENDING"
              ? "All incoming customer orders have been reviewed and accepted."
              : "No orders match the current status filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isPending = order.order_status === "PENDING";
            const isAccepted = order.order_status === "ACCEPTED";
            const isPreparing = order.order_status === "PREPARING";
            const isReady = order.order_status === "READY";
            const isCompleted = order.order_status === "COMPLETED";

            return (
              <div
                key={order.id}
                className={`rounded-2xl border bg-white p-4 shadow-xs flex flex-col justify-between transition-all ${
                  isPending
                    ? "border-[#B77932] ring-2 ring-[#B77932]/20"
                    : "border-[#E7E1D8]"
                }`}
              >
                {/* Order Top Banner */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#29241F]">
                          #{order.order_number}
                        </span>
                        <Badge variant="primary" className="text-2xs py-0">
                          {order.table?.label ||
                            (order as unknown as { restaurant_tables?: { table_number?: string } })?.restaurant_tables?.table_number ||
                            "Counter"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-2xs text-[#78716C] mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{getElapsedTime(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          isCompleted
                            ? "success"
                            : isPending
                            ? "warning"
                            : order.order_status === "CANCELLED" || order.order_status === "REJECTED"
                            ? "danger"
                            : "primary"
                        }
                      >
                        {order.order_status}
                      </Badge>

                      <span
                        className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                          order.payment_status === "PAID"
                            ? "bg-[#557A52]/10 text-[#557A52]"
                            : "bg-[#B77932]/10 text-[#B77932]"
                        }`}
                      >
                        {order.payment_status === "PAID" ? "PAID" : "UNPAID"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information (if provided) */}
                  {(order.customer_name || order.customer_phone) && (
                    <div className="flex items-center gap-3 text-2xs text-[#78716C] bg-[#FAF8F4] px-2.5 py-1.5 rounded-xl border border-[#E7E1D8]/60">
                      {order.customer_name && (
                        <span className="flex items-center gap-1 truncate">
                          <User className="h-3 w-3" />
                          {order.customer_name}
                        </span>
                      )}
                      {order.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer_phone}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Special Cooking Notes */}
                  {(order.special_notes || (order as unknown as { special_instructions?: string })?.special_instructions) && (
                    <div className="rounded-xl border border-[#B77932]/30 bg-[#B77932]/10 p-2 text-2xs text-[#B77932] font-medium">
                      Note: {order.special_notes || (order as unknown as { special_instructions?: string })?.special_instructions}
                    </div>
                  )}

                  {/* Items Snapshot */}
                  <div className="space-y-1.5 pt-1 border-t border-[#FAF8F4]">
                    <div className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
                      Items Ordered
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {(order.items || (order as unknown as { order_items?: RestaurantOrder["items"] })?.order_items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="h-4 w-4 rounded-md bg-[#FAF8F4] border border-[#E7E1D8] font-bold text-3xs text-[#783F24] flex items-center justify-center shrink-0">
                              {item.quantity}×
                            </span>
                            <span className="truncate text-[#29241F]">
                              {item.item_name_snapshot}
                            </span>
                          </div>
                          <span className="font-medium text-[#78716C] shrink-0 ml-2">
                            {formatPaiseToINR(item.line_total_paise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions and Status Controls */}
                <div className="pt-4 mt-3 border-t border-[#E7E1D8] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#29241F]">
                    <span>Total Amount</span>
                    <span className="text-[#783F24] text-sm">
                      {formatPaiseToINR(order.total_paise)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {/* Status Flow Buttons */}
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          className="flex-1"
                          onClick={() => setRejectOrder(order)}
                          isLoading={statusMutation.isPending}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          className="flex-1"
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: order.id,
                              status: "ACCEPTED",
                            })
                          }
                          isLoading={statusMutation.isPending}
                        >
                          Accept
                        </Button>
                      </>
                    )}

                    {isAccepted && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() =>
                          statusMutation.mutate({
                            orderId: order.id,
                            status: "PREPARING",
                          })
                        }
                        isLoading={statusMutation.isPending}
                      >
                        <ChefHat className="h-3.5 w-3.5 mr-1.5" />
                        Start Preparing
                      </Button>
                    )}

                    {isPreparing && (
                      <Button
                        size="sm"
                        variant="accent"
                        className="w-full"
                        onClick={() =>
                          statusMutation.mutate({
                            orderId: order.id,
                            status: "READY",
                          })
                        }
                        isLoading={statusMutation.isPending}
                      >
                        <BellRing className="h-3.5 w-3.5 mr-1.5" />
                        Mark as Ready
                      </Button>
                    )}

                    {isReady && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full bg-[#557A52] hover:bg-[#436341]"
                        onClick={() =>
                          statusMutation.mutate({
                            orderId: order.id,
                            status: "COMPLETED",
                          })
                        }
                        isLoading={statusMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Complete Order
                      </Button>
                    )}

                    {/* Settle Payment Button if Unpaid */}
                    {order.payment_status === "UNPAID" && (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Mark Payment as Received"
                        onClick={() => setSettleOrder(order)}
                        className="px-2"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-[#557A52]" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Order Reason Dialog */}
      {rejectOrder && (
        <Dialog
          isOpen={true}
          onClose={() => setRejectOrder(null)}
          title={`Reject Order #${rejectOrder.order_number}?`}
          size="sm"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-[#78716C]">
              Please state why this order cannot be fulfilled. The customer will be informed on their live status screen.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#29241F]">
                Rejection Reason
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-[#E7E1D8] p-2 text-xs text-[#29241F] focus:border-[#B94A48] focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectOrder(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  statusMutation.mutate({
                    orderId: rejectOrder.id,
                    status: "REJECTED",
                    reason: rejectReason,
                  })
                }
                isLoading={statusMutation.isPending}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Settle Payment Dialog */}
      {settleOrder && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setSettleOrder(null)}
          onConfirm={() =>
            paymentMutation.mutate({
              orderId: settleOrder.id,
              paymentStatus: "PAID",
            })
          }
          title={`Confirm Payment for #${settleOrder.order_number}`}
          message={`Confirm that ${formatPaiseToINR(
            settleOrder.total_paise
          )} has been received via Cash / UPI / Card for Table ${
            settleOrder.table?.label || "Counter"
          }.`}
          confirmLabel="Mark as Paid"
          variant="primary"
          isLoading={paymentMutation.isPending}
        />
      )}
    </div>
  );
}
