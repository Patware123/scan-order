"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChefHat,
  Clock,
  Check,
  Flame,
  BellRing,
  RefreshCw,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi, RestaurantOrder } from "@/services/api/restaurant.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export default function KitchenDisplayPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId, activeRestaurant } = useAuth();

  // Fast polling for kitchen display (every 5 seconds)
  const { data: orders, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["kitchenOrders", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getOrders(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
    refetchInterval: 5000,
  });

  const [optimisticError, setOptimisticError] = React.useState<string | null>(null);

  // Optimistic UI state machine transition mutation
  const transitionMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: RestaurantOrder["order_status"];
    }) => restaurantApi.updateOrderStatus(activeRestaurantId!, orderId, status),

    // Optimistic Update: Immediately move the ticket to target column in cache
    onMutate: async ({ orderId, status }) => {
      setOptimisticError(null);

      // 1. Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["kitchenOrders", activeRestaurantId] });

      // 2. Snapshot the previous orders state
      const previousOrders = queryClient.getQueryData<RestaurantOrder[]>([
        "kitchenOrders",
        activeRestaurantId,
      ]);

      // 3. Immediately update order_status in local cache for instant UI feedback
      if (previousOrders) {
        queryClient.setQueryData<RestaurantOrder[]>(
          ["kitchenOrders", activeRestaurantId],
          previousOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  order_status: status,
                  updated_at: new Date().toISOString(),
                }
              : o
          )
        );
      }

      return { previousOrders };
    },

    // If the API request fails, immediately roll back to previous orders state
    onError: (err: any, _vars, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(
          ["kitchenOrders", activeRestaurantId],
          context.previousOrders
        );
      }
      const msg =
        err?.response?.error?.message ||
        err?.message ||
        "Action failed. Ticket was reverted to its previous state.";
      setOptimisticError(msg);
    },

    // Background server synchronization once request completes
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchenOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", activeRestaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", activeRestaurantId] });
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  // Filter into the 3 kitchen stages:
  // Column 1: Incoming Queue (PENDING and ACCEPTED orders)
  const queueOrders = (orders || []).filter(
    (o) => o.order_status === "PENDING" || o.order_status === "ACCEPTED"
  );
  const preparingOrders = (orders || []).filter((o) => o.order_status === "PREPARING");
  const readyOrders = (orders || []).filter((o) => o.order_status === "READY");

  return (
    <div className="space-y-4">
      {/* Optimistic Error Alert */}
      {optimisticError && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 text-xs font-semibold text-[#B94A48]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{optimisticError}</span>
          </div>
          <button
            onClick={() => setOptimisticError(null)}
            className="text-xs underline hover:text-[#8E3230] ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* KDS Header */}
      <div className="flex items-center justify-between bg-white border border-[#E7E1D8] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#783F24] text-white flex items-center justify-center">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#29241F] leading-tight">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-[#78716C]">
              {activeRestaurant?.name} • Live Ticket Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#B77932]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B77932] animate-pulse" />
              {queueOrders.length} Incoming
            </span>
            <span className="flex items-center gap-1.5 text-[#783F24]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#783F24]" />
              {preparingOrders.length} Cooking
            </span>
            <span className="flex items-center gap-1.5 text-[#557A52]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#557A52]" />
              {readyOrders.length} Ready
            </span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-[#78716C] hover:text-[#29241F] cursor-pointer"
            title="Refresh Tickets"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin text-[#783F24]" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Column 1: Confirmed / Queue */}
          <div className="rounded-2xl bg-[#FAF8F4] border border-[#E7E1D8] p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#B77932]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#29241F]">
                  Queue ({queueOrders.length})
                </h2>
              </div>
              <span className="text-3xs text-[#78716C]">Needs Prep</span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {queueOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] border border-dashed border-[#E7E1D8] rounded-xl bg-white/50">
                  No tickets in queue
                </div>
              ) : (
                queueOrders.map((order) => {
                  const isPending = order.order_status === "PENDING";
                  return (
                    <KitchenOrderTicket
                      key={order.id}
                      order={order}
                      actionLabel={isPending ? "Accept Order" : "Start Cooking"}
                      actionIcon={isPending ? Check : Flame}
                      actionVariant={isPending ? "primary" : "secondary"}
                      isMutating={transitionMutation.isPending}
                      onAction={() =>
                        transitionMutation.mutate({
                          orderId: order.id,
                          status: isPending ? "ACCEPTED" : "PREPARING",
                        })
                      }
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: In Preparation */}
          <div className="rounded-2xl bg-[#FAF8F4] border border-[#E7E1D8] p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#783F24]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#29241F]">
                  Cooking ({preparingOrders.length})
                </h2>
              </div>
              <span className="text-3xs text-[#78716C]">On the Stove</span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {preparingOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] border border-dashed border-[#E7E1D8] rounded-xl bg-white/50">
                  Kitchen is clear
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <KitchenOrderTicket
                    key={order.id}
                    order={order}
                    actionLabel="Mark Ready"
                    actionIcon={BellRing}
                    actionVariant="accent"
                    isMutating={transitionMutation.isPending}
                    onAction={() =>
                      transitionMutation.mutate({
                        orderId: order.id,
                        status: "READY",
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Ready for Pickup / Serving */}
          <div className="rounded-2xl bg-[#FAF8F4] border border-[#E7E1D8] p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#557A52]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#29241F]">
                  Ready ({readyOrders.length})
                </h2>
              </div>
              <span className="text-3xs text-[#78716C]">Ready to Serve</span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {readyOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] border border-dashed border-[#E7E1D8] rounded-xl bg-white/50">
                  No orders ready
                </div>
              ) : (
                readyOrders.map((order) => (
                  <KitchenOrderTicket
                    key={order.id}
                    order={order}
                    actionLabel="Dispatched"
                    actionIcon={Check}
                    actionVariant="primary"
                    isMutating={transitionMutation.isPending}
                    onAction={() =>
                      transitionMutation.mutate({
                        orderId: order.id,
                        status: "COMPLETED",
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KitchenOrderTicket({
  order,
  actionLabel,
  actionIcon: ActionIcon,
  actionVariant,
  isMutating,
  onAction,
}: {
  order: RestaurantOrder;
  actionLabel: string;
  actionIcon: React.ElementType;
  actionVariant: "primary" | "secondary" | "accent";
  isMutating: boolean;
  onAction: () => void;
}) {
  const elapsedMinutes = getElapsedMinutes(order.created_at);
  const isDelayed = elapsedMinutes >= 15;
  const tableLabel =
    order.table?.label ||
    (order as unknown as { restaurant_tables?: { table_number?: string } })?.restaurant_tables?.table_number ||
    "Counter";
  const specialNotes =
    order.special_notes ||
    (order as unknown as { special_instructions?: string })?.special_instructions;
  const items =
    order.items ||
    (order as unknown as { order_items?: RestaurantOrder["items"] })?.order_items ||
    [];

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-xs space-y-3 transition-all ${
        isDelayed ? "border-[#B94A48] ring-2 ring-[#B94A48]/20" : "border-[#E7E1D8]"
      }`}
    >
      {/* Ticket Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#29241F]">
              #{order.order_number}
            </span>
            {order.order_status === "PENDING" && (
              <Badge variant="warning" className="text-3xs py-0 px-1.5 animate-pulse">
                New Order
              </Badge>
            )}
          </div>
          <div className="text-xs font-bold text-[#783F24]">
            {tableLabel}
          </div>
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
            isDelayed
              ? "bg-[#B94A48]/10 text-[#B94A48] animate-pulse"
              : "bg-[#FAF8F4] border border-[#E7E1D8] text-[#78716C]"
          }`}
        >
          <Clock className="h-3 w-3" />
          <span>{elapsedMinutes}m</span>
        </div>
      </div>

      {/* Special Kitchen Notes */}
      {specialNotes && (
        <div className="rounded-xl border border-[#B77932]/30 bg-[#B77932]/10 p-2 text-2xs font-semibold text-[#B77932]">
          ⚠️ Note: {specialNotes}
        </div>
      )}

      {/* Ordered Items List (Large and Bold for Chef Legibility) */}
      <div className="space-y-1.5 pt-2 border-t border-[#FAF8F4]">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-baseline justify-between text-xs sm:text-sm font-semibold text-[#29241F]"
          >
            <div className="flex items-baseline gap-2">
              <span className="h-5 w-5 rounded-md bg-[#783F24] text-white flex items-center justify-center text-xs font-black shrink-0">
                {item.quantity}
              </span>
              <span>{item.item_name_snapshot}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <Button
          size="lg"
          variant={actionVariant}
          disabled={isMutating}
          onClick={onAction}
          className="w-full h-11 text-sm font-bold rounded-xl shadow-xs"
        >
          <ActionIcon className="h-4 w-4 mr-1.5" />
          <span>{actionLabel}</span>
        </Button>
      </div>
    </div>
  );
}
