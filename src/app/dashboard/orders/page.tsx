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
  LayoutGrid,
  Layers,
  UtensilsCrossed,
  Receipt,
  Filter,
  Flame,
  ArrowRight,
  Plus,
  Trash2,
  Package,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi, RestaurantOrder, RestaurantTable } from "@/services/api/restaurant.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrderModal } from "@/features/orders/create-order-modal";

type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "COMPLETED" | "UNPAID";
type ViewMode = "ORDERS" | "TABLE_MATRIX";

function getElapsedTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

function getOrderTableLabel(order: RestaurantOrder): string {
  return (
    order.table?.label ||
    (order as unknown as { restaurant_tables?: { table_number?: string } })?.restaurant_tables?.table_number ||
    (order as unknown as { table_number?: string })?.table_number ||
    "Counter / Takeaway"
  );
}

function getOrderTableId(order: RestaurantOrder): string | null {
  return (
    order.table?.id ||
    (order as unknown as { table_id?: string })?.table_id ||
    null
  );
}

export default function LiveOrdersPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId } = useAuth();

  // Tab State: "ALL" or specific table ID or table label
  const [selectedTableTab, setSelectedTableTab] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("ORDERS");

  // Create Order Modal State
  const [isCreateOrderOpen, setIsCreateOrderOpen] = React.useState(false);

  // Reject Modal State
  const [rejectOrder, setRejectOrder] = React.useState<RestaurantOrder | null>(null);
  const [rejectReason, setRejectReason] = React.useState("Kitchen busy / item out of stock");

  // Payment Modal State
  const [settleOrder, setSettleOrder] = React.useState<RestaurantOrder | null>(null);

  // Delete / Archive Modal State
  const [deleteTarget, setDeleteTarget] = React.useState<RestaurantOrder | null>(null);
  const [deleteReason, setDeleteReason] = React.useState("Order cancelled / table cleared");
  const [optimisticActionError, setOptimisticActionError] = React.useState<string | null>(null);

  // Fetch Tables
  const { data: tables = [], isLoading: isTablesLoading } = useQuery<RestaurantTable[]>({
    queryKey: ["restaurantTables", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getTables(activeRestaurantId) : []),
    enabled: !!activeRestaurantId,
  });

  // Fetch Orders with throttled polling (every 5 seconds)
  const { data: orders = [], isLoading: isOrdersLoading, isRefetching, refetch } = useQuery<RestaurantOrder[]>({
    queryKey: ["restaurantOrders", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getOrders(activeRestaurantId) : []),
    enabled: !!activeRestaurantId,
    refetchInterval: 5000,
  });

  // Optimistic Status Mutation (Requirement 6)
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
    onMutate: async ({ orderId, status }) => {
      setOptimisticActionError(null);
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });

      // Snapshot previous cache
      const previousOrders = queryClient.getQueryData<RestaurantOrder[]>([
        "restaurantOrders",
        activeRestaurantId,
      ]);

      // Optimistically update order status in cache
      if (previousOrders) {
        queryClient.setQueryData<RestaurantOrder[]>(
          ["restaurantOrders", activeRestaurantId],
          previousOrders.map((o) =>
            o.id === orderId
              ? { ...o, order_status: status, updated_at: new Date().toISOString() }
              : o
          )
        );
      }

      return { previousOrders };
    },
    onError: (err: any, _vars, context) => {
      // Rollback to snapshot on failure
      if (context?.previousOrders) {
        queryClient.setQueryData(
          ["restaurantOrders", activeRestaurantId],
          context.previousOrders
        );
      }
      setOptimisticActionError(err?.message || "Order status update failed. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", activeRestaurantId] });
      setRejectOrder(null);
    },
  });

  // Optimistic Payment Mutation (Requirement 6)
  const paymentMutation = useMutation({
    mutationFn: ({ orderId, paymentStatus }: { orderId: string; paymentStatus: "PAID" | "UNPAID" }) =>
      restaurantApi.updatePaymentStatus(activeRestaurantId!, orderId, paymentStatus),
    onMutate: async ({ orderId, paymentStatus }) => {
      setOptimisticActionError(null);
      await queryClient.cancelQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });

      const previousOrders = queryClient.getQueryData<RestaurantOrder[]>([
        "restaurantOrders",
        activeRestaurantId,
      ]);

      if (previousOrders) {
        queryClient.setQueryData<RestaurantOrder[]>(
          ["restaurantOrders", activeRestaurantId],
          previousOrders.map((o) =>
            o.id === orderId ? { ...o, payment_status: paymentStatus } : o
          )
        );
      }

      return { previousOrders };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(
          ["restaurantOrders", activeRestaurantId],
          context.previousOrders
        );
      }
      setOptimisticActionError(err?.message || "Payment status update failed. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", activeRestaurantId] });
      setSettleOrder(null);
    },
  });

  // Delete / Archive Mutation (Requirement 5)
  const deleteMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      restaurantApi.deleteOrder(activeRestaurantId!, orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", activeRestaurantId] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      setOptimisticActionError(err?.message || "Failed to delete/archive order");
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  // Active / Live Orders (excluding completed, cancelled, rejected from current urgent count)
  const liveOrders = orders.filter(
    (o) => o.order_status !== "CANCELLED" && o.order_status !== "REJECTED"
  );
  const pendingOrders = liveOrders.filter((o) => o.order_status === "PENDING");
  const cookingOrders = liveOrders.filter(
    (o) => o.order_status === "ACCEPTED" || o.order_status === "PREPARING"
  );
  const readyOrders = liveOrders.filter((o) => o.order_status === "READY");
  const unpaidOrders = liveOrders.filter((o) => o.payment_status === "UNPAID");

  const totalUnpaidPaise = unpaidOrders.reduce((sum, o) => sum + (o.total_paise || 0), 0);

  // Group orders by Table
  const tableOrderCounts = new Map<string, { total: number; pending: number; ready: number; active: number }>();
  orders.forEach((o) => {
    const tableId = getOrderTableId(o);
    const tableLabel = getOrderTableLabel(o);
    const key = tableId || tableLabel;

    const current = tableOrderCounts.get(key) || { total: 0, pending: 0, ready: 0, active: 0 };
    current.total += 1;
    if (o.order_status === "PENDING") current.pending += 1;
    if (o.order_status === "READY") current.ready += 1;
    if (o.order_status !== "COMPLETED" && o.order_status !== "CANCELLED" && o.order_status !== "REJECTED") {
      current.active += 1;
    }
    tableOrderCounts.set(key, current);
  });

  // Filter Orders based on selected Table Tab, Status Filter, and Search
  const filteredOrders = orders.filter((order) => {
    const orderTableId = getOrderTableId(order);
    const orderTableLabel = getOrderTableLabel(order);

    // 1. Table Tab Filter
    if (selectedTableTab !== "ALL") {
      if (selectedTableTab === "COUNTER") {
        if (orderTableId || (orderTableLabel && !orderTableLabel.toLowerCase().includes("counter"))) {
          return false;
        }
      } else {
        const matchesId = orderTableId === selectedTableTab;
        const matchesLabel = orderTableLabel === selectedTableTab;
        if (!matchesId && !matchesLabel) {
          return false;
        }
      }
    }

    // 2. Status Filter
    if (statusFilter === "UNPAID") {
      if (order.payment_status !== "UNPAID") return false;
    } else if (statusFilter !== "ALL") {
      if (order.order_status !== statusFilter) return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = order.order_number?.toLowerCase().includes(q);
      const matchName = order.customer_name?.toLowerCase().includes(q);
      const matchTable = orderTableLabel.toLowerCase().includes(q);
      const matchItem = (order.items || []).some((i) =>
        (i.item_name_snapshot || (i as any).itemNameSnapshot || "").toLowerCase().includes(q)
      );
      if (!matchNum && !matchName && !matchTable && !matchItem) {
        return false;
      }
    }

    return true;
  });

  const selectedTableObj = tables.find(
    (t) => t.id === selectedTableTab || t.label === selectedTableTab
  );

  return (
    <div className="space-y-5">
      {/* Page Header & Live Summary Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-bold">
            Floor Management & KDS
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#29241F] flex items-center gap-2.5">
            <span>Live Table Orders</span>
            {pendingOrders.length > 0 && (
              <span className="h-6 px-2.5 rounded-full bg-[#B77932] text-white text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-xs">
                <span className="h-2 w-2 rounded-full bg-white" />
                {pendingOrders.length} New Orders
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-[#E7E1D8] shadow-2xs">
            <button
              onClick={() => setViewMode("ORDERS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "ORDERS"
                  ? "bg-[#783F24] text-white shadow-2xs"
                  : "text-[#78716C] hover:text-[#29241F]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Orders View</span>
            </button>
            <button
              onClick={() => setViewMode("TABLE_MATRIX")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "TABLE_MATRIX"
                  ? "bg-[#783F24] text-white shadow-2xs"
                  : "text-[#78716C] hover:text-[#29241F]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Table Matrix</span>
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E7E1D8] bg-white text-xs font-semibold text-[#78716C] hover:text-[#29241F] cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-[#783F24]" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#783F24] text-white text-xs font-bold hover:bg-[#63331D] cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {optimisticActionError && (
        <div className="p-3 rounded-2xl bg-[#B94A48]/10 border border-[#B94A48]/30 text-xs text-[#B94A48] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{optimisticActionError}</span>
          </div>
          <button
            onClick={() => setOptimisticActionError(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E7E1D8] shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] flex items-center justify-center text-[#783F24] shrink-0">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xs font-semibold uppercase tracking-wider text-[#78716C]">
              Active Tables
            </div>
            <div className="text-lg font-black text-[#29241F]">
              {Array.from(tableOrderCounts.values()).filter((v) => v.active > 0).length}
              <span className="text-xs font-normal text-[#78716C] ml-1">/ {tables.length || 0}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E7E1D8] shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#B77932]/10 flex items-center justify-center text-[#B77932] shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xs font-semibold uppercase tracking-wider text-[#78716C]">
              Pending Acceptance
            </div>
            <div className="text-lg font-black text-[#B77932]">
              {pendingOrders.length}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E7E1D8] shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#783F24]/10 flex items-center justify-center text-[#783F24] shrink-0">
            <Flame className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xs font-semibold uppercase tracking-wider text-[#78716C]">
              Cooking in Kitchen
            </div>
            <div className="text-lg font-black text-[#783F24]">
              {cookingOrders.length}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E7E1D8] shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#557A52]/10 flex items-center justify-center text-[#557A52] shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xs font-semibold uppercase tracking-wider text-[#78716C]">
              Unsettled Total
            </div>
            <div className="text-lg font-black text-[#557A52]">
              {formatPaiseToINR(totalUnpaidPaise)}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* PRIMARY TAB BAR: AS PER TABLE */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3 bg-white border border-[#E7E1D8] p-4 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#29241F] flex items-center gap-1.5">
            <UtensilsCrossed className="h-3.5 w-3.5 text-[#783F24]" />
            <span>Select Table:</span>
          </span>
          <span className="text-3xs text-[#78716C]">
            Click any table to isolate its tickets and active balance
          </span>
        </div>

        {/* Scrollable Table Tabs Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
          {/* Tab: All Tables */}
          <button
            onClick={() => setSelectedTableTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              selectedTableTab === "ALL"
                ? "bg-[#783F24] text-white shadow-xs scale-102"
                : "bg-[#FAF8F4] text-[#78716C] border border-[#E7E1D8] hover:bg-[#F3E6D4]/50 hover:text-[#29241F]"
            }`}
          >
            <span>All Tables</span>
            <span
              className={`text-3xs px-1.5 py-0.5 rounded-full font-bold ${
                selectedTableTab === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-white border border-[#E7E1D8] text-[#783F24]"
              }`}
            >
              {orders.length}
            </span>
          </button>

          {/* Dynamic Table Tabs */}
          {tables.map((table) => {
            const tableId = table.id;
            const tableLabel = table.label || table.table_number || "Table";
            const stats = tableOrderCounts.get(tableId) || tableOrderCounts.get(tableLabel) || {
              total: 0,
              pending: 0,
              ready: 0,
              active: 0,
            };
            const isSelected = selectedTableTab === tableId || selectedTableTab === tableLabel;

            return (
              <button
                key={table.id}
                onClick={() => setSelectedTableTab(table.id)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-[#783F24] text-white shadow-xs scale-102"
                    : stats.pending > 0
                    ? "bg-[#B77932]/10 border-2 border-[#B77932] text-[#B77932] hover:bg-[#B77932]/20"
                    : stats.active > 0
                    ? "bg-white border border-[#783F24]/30 text-[#783F24] hover:bg-[#FAF8F4]"
                    : "bg-[#FAF8F4] text-[#78716C] border border-[#E7E1D8] hover:bg-white hover:text-[#29241F]"
                }`}
              >
                {/* Active / Pending Status Dot */}
                {stats.pending > 0 ? (
                  <span className="h-2 w-2 rounded-full bg-[#B77932] animate-ping" />
                ) : stats.ready > 0 ? (
                  <span className="h-2 w-2 rounded-full bg-[#557A52]" />
                ) : stats.active > 0 ? (
                  <span className="h-2 w-2 rounded-full bg-[#783F24]" />
                ) : null}

                <span>{tableLabel}</span>

                {/* Orders Count Badge */}
                {stats.active > 0 && (
                  <span
                    className={`text-3xs px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : stats.pending > 0
                        ? "bg-[#B77932] text-white"
                        : "bg-[#FAF8F4] border border-[#E7E1D8] text-[#783F24]"
                    }`}
                  >
                    {stats.active}
                  </span>
                )}
              </button>
            );
          })}

          {/* Counter / Takeaway Tab */}
          <button
            onClick={() => setSelectedTableTab("COUNTER")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              selectedTableTab === "COUNTER"
                ? "bg-[#783F24] text-white shadow-xs"
                : "bg-[#FAF8F4] text-[#78716C] border border-[#E7E1D8] hover:bg-white"
            }`}
          >
            <span>Counter / Takeaway</span>
            {(tableOrderCounts.get("Counter / Takeaway")?.active || 0) > 0 && (
              <span
                className={`text-3xs px-1.5 py-0.5 rounded-full font-bold ${
                  selectedTableTab === "COUNTER" ? "bg-white/20 text-white" : "bg-white text-[#783F24]"
                }`}
              >
                {tableOrderCounts.get("Counter / Takeaway")?.active}
              </span>
            )}
          </button>
        </div>

        {/* Selected Table Context Banner (When Specific Table is Selected) */}
        {selectedTableTab !== "ALL" && (
          <div className="pt-2 border-t border-[#FAF8F4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#29241F]">
              <span className="font-bold text-sm text-[#783F24]">
                Viewing: {selectedTableObj?.label || (selectedTableTab === "COUNTER" ? "Counter / Takeaway" : "Selected Table")}
              </span>
              {selectedTableObj && (
                <span className="text-2xs text-[#78716C]">
                  (Capacity: {selectedTableObj.capacity} guests • {selectedTableObj.ordering_mode})
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xs text-[#78716C]">
                Active tickets for this table:{" "}
                <strong className="text-[#29241F]">{filteredOrders.length}</strong>
              </span>
              <button
                onClick={() => setSelectedTableTab("ALL")}
                className="text-xs text-[#783F24] font-semibold underline hover:text-[#5B2E19] cursor-pointer"
              >
                Show All Tables
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SECONDARY STATUS PILLS & SEARCH */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { id: "ALL", label: "All Status" },
              { id: "PENDING", label: "Pending" },
              { id: "ACCEPTED", label: "Accepted" },
              { id: "PREPARING", label: "Cooking" },
              { id: "READY", label: "Ready to Serve" },
              { id: "COMPLETED", label: "Completed" },
              { id: "UNPAID", label: "Unpaid Only" },
            ] as Array<{ id: StatusFilter; label: string }>
          ).map((tab) => {
            const count =
              tab.id === "ALL"
                ? orders.length
                : tab.id === "UNPAID"
                ? unpaidOrders.length
                : orders.filter((o) => o.order_status === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#29241F] text-white shadow-2xs"
                    : "bg-white text-[#78716C] border border-[#E7E1D8] hover:bg-[#FAF8F4]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-3xs px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-[#FAF8F4] text-[#78716C]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search order #, table, dish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-xl border border-[#E7E1D8] bg-white pl-8 pr-3 text-xs text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none"
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 1: TABLE MATRIX OVERVIEW */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {viewMode === "TABLE_MATRIX" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const tableOrders = orders.filter((o) => {
              const matchesId = getOrderTableId(o) === table.id;
              const matchesLabel = getOrderTableLabel(o) === table.label;
              return (
                (matchesId || matchesLabel) &&
                o.order_status !== "CANCELLED" &&
                o.order_status !== "REJECTED"
              );
            });

            const hasPending = tableOrders.some((o) => o.order_status === "PENDING");
            const hasCooking = tableOrders.some(
              (o) => o.order_status === "ACCEPTED" || o.order_status === "PREPARING"
            );
            const hasReady = tableOrders.some((o) => o.order_status === "READY");
            const isOccupied = tableOrders.length > 0;
            const tableTotalPaise = tableOrders.reduce((sum, o) => sum + (o.total_paise || 0), 0);
            const hasUnpaid = tableOrders.some((o) => o.payment_status === "UNPAID");

            return (
              <div
                key={table.id}
                onClick={() => {
                  setSelectedTableTab(table.id);
                  setViewMode("ORDERS");
                }}
                className={`rounded-2xl border p-4.5 bg-white shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                  hasPending
                    ? "border-[#B77932] ring-2 ring-[#B77932]/20"
                    : isOccupied
                    ? "border-[#783F24]/30"
                    : "border-[#E7E1D8] opacity-80 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#29241F] group-hover:text-[#783F24] transition-colors">
                          {table.label}
                        </span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            hasPending
                              ? "bg-[#B77932] animate-ping"
                              : hasReady
                              ? "bg-[#557A52]"
                              : isOccupied
                              ? "bg-[#783F24]"
                              : "bg-[#E7E1D8]"
                          }`}
                        />
                      </div>
                      <div className="text-2xs text-[#78716C]">
                        Capacity: {table.capacity} guests • {table.ordering_mode}
                      </div>
                    </div>

                    <Badge
                      variant={
                        hasPending
                          ? "warning"
                          : hasReady
                          ? "success"
                          : isOccupied
                          ? "primary"
                          : "secondary"
                      }
                    >
                      {hasPending
                        ? "New Order!"
                        : hasReady
                        ? "Food Ready"
                        : isOccupied
                        ? "Occupied"
                        : "Available"}
                    </Badge>
                  </div>

                  {/* Active Orders List inside Table Card */}
                  <div className="mt-3.5 space-y-2">
                    {tableOrders.length === 0 ? (
                      <div className="py-4 text-center text-2xs text-[#78716C] bg-[#FAF8F4] rounded-xl border border-dashed border-[#E7E1D8]">
                        No active orders • Table is clean
                      </div>
                    ) : (
                      tableOrders.map((to) => (
                        <div
                          key={to.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F4] text-xs border border-[#E7E1D8]/60"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-[#29241F] text-2xs">
                              #{to.order_number}
                            </span>
                            <span className="text-3xs px-1.5 py-0.2 rounded-md bg-white border border-[#E7E1D8] font-semibold text-[#78716C]">
                              {to.order_status}
                            </span>
                          </div>
                          <span className="font-bold text-2xs text-[#783F24]">
                            {formatPaiseToINR(to.total_paise)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Balance & Action */}
                <div className="pt-3 border-t border-[#FAF8F4] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-3xs text-[#78716C] uppercase font-bold block">
                      Table Balance
                    </span>
                    <span className="font-black text-[#29241F]">
                      {formatPaiseToINR(tableTotalPaise)}
                    </span>
                    {hasUnpaid && isOccupied && (
                      <span className="text-3xs font-bold text-[#B77932] block">Unpaid</span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-[#783F24] inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Manage Orders</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 2: ORDERS GRID VIEW */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {viewMode === "ORDERS" && (
        <>
          {isOrdersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-[#557A52] mx-auto" />
              <h3 className="text-sm font-bold text-[#29241F]">No Orders in This View</h3>
              <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                {selectedTableTab !== "ALL"
                  ? `There are no orders matching this filter for ${selectedTableObj?.label || "this table"}.`
                  : "All tables are clear or no orders match the selected status filter."}
              </p>
              {selectedTableTab !== "ALL" && (
                <button
                  onClick={() => setSelectedTableTab("ALL")}
                  className="mt-2 text-xs text-[#783F24] font-semibold underline cursor-pointer"
                >
                  View all tables
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => {
                const isPending = order.order_status === "PENDING";
                const isAccepted = order.order_status === "ACCEPTED";
                const isPreparing = order.order_status === "PREPARING";
                const isReady = order.order_status === "READY";
                const isCompleted = order.order_status === "COMPLETED";

                const tableLabel = getOrderTableLabel(order);

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border bg-white p-4.5 shadow-2xs flex flex-col justify-between transition-all ${
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
                            <span className="text-base font-black text-[#29241F]">
                              #{order.order_number}
                            </span>
                            {/* Prominent Table or Parcel Identifier Badge */}
                            {order.order_type === "PARCEL" ? (
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#783F24]/10 border border-[#783F24]/30 text-xs font-black text-[#783F24] flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Parcel
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F4] border border-[#E7E1D8] text-xs font-black text-[#783F24]">
                                {tableLabel}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-2xs text-[#78716C] mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{getElapsedTime(order.created_at)}</span>
                            {order.order_source && order.order_source !== "CUSTOMER" && (
                              <span className="text-3xs uppercase px-1 py-0.2 rounded bg-stone-100 text-[#78716C] font-semibold">
                                via {order.order_source.toLowerCase()}
                              </span>
                            )}
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
                        <div className="rounded-xl border border-[#B77932]/30 bg-[#B77932]/10 p-2 text-2xs text-[#B77932] font-semibold">
                          ⚠️ Note: {order.special_notes || (order as unknown as { special_instructions?: string })?.special_instructions}
                        </div>
                      )}

                      {/* Items Snapshot */}
                      <div className="space-y-1.5 pt-1 border-t border-[#FAF8F4]">
                        <div className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
                          Items Ordered ({order.items?.length || 0})
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {(order.items || (order as unknown as { order_items?: RestaurantOrder["items"] })?.order_items || []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="h-4 w-4 rounded-md bg-[#FAF8F4] border border-[#E7E1D8] font-black text-3xs text-[#783F24] flex items-center justify-center shrink-0">
                                  {item.quantity}×
                                </span>
                                <span className="truncate text-[#29241F] font-medium">
                                  {item.item_name_snapshot || (item as any).itemNameSnapshot || "Dish Item"}
                                </span>
                              </div>
                              <span className="font-semibold text-[#78716C] shrink-0 ml-2">
                                {formatPaiseToINR(item.line_total_paise || (item as any).lineTotalPaise || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions and Status Controls */}
                    <div className="pt-4 mt-3 border-t border-[#E7E1D8] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#29241F]">
                        <span>Total Bill</span>
                        <span className="text-[#783F24] text-base font-black">
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
                              Accept Order
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
                            className="px-2.5"
                          >
                            <CreditCard className="h-3.5 w-3.5 text-[#557A52]" />
                          </Button>
                        )}

                        {/* Delete / Archive Order Button (Requirement 5) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete / Archive Order"
                          onClick={() => setDeleteTarget(order)}
                          className="px-2 text-[#78716C] hover:text-[#B94A48] hover:bg-[#B94A48]/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
            getOrderTableLabel(settleOrder)
          }.`}
          confirmLabel="Mark as Paid"
          variant="primary"
          isLoading={paymentMutation.isPending}
        />
      )}

      {/* Delete / Archive Order Dialog (Requirement 5) */}
      {deleteTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() =>
            deleteMutation.mutate({
              orderId: deleteTarget.id,
              reason: deleteReason,
            })
          }
          title={`Delete / Archive Order #${deleteTarget.order_number}?`}
          message={`Are you sure you want to delete and archive Order #${deleteTarget.order_number}? Any active table lock will be released, and financial and audit records will be securely preserved.`}
          confirmLabel="Archive Order"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      )}

      {/* Create Order Modal (Requirement 4: Table & Parcel Orders) */}
      {isCreateOrderOpen && (
        <CreateOrderModal
          isOpen={isCreateOrderOpen}
          onClose={() => setIsCreateOrderOpen(false)}
          restaurantId={activeRestaurantId}
        />
      )}
    </div>
  );
}
