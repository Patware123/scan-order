"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Plus,
  AlertTriangle,
  History,
  UtensilsCrossed,
  Search,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Trash2,
  Edit,
  PackageCheck,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { restaurantApi } from "@/services/api/restaurant.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPaiseToINR } from "@/lib/utils/currency";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId } = useAuth();

  const [activeTab, setActiveTab] = React.useState<"items" | "movements" | "recipes">("items");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<"ALL" | "LOW" | "OUT">("ALL");

  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [adjustingItem, setAdjustingItem] = React.useState<any | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<any | null>(null);
  const [isAddRecipeOpen, setIsAddRecipeOpen] = React.useState(false);

  // Queries
  const { data: inventory, isLoading: isInvLoading } = useQuery({
    queryKey: ["inventory", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getInventory(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
  });

  const { data: movements, isLoading: isMovLoading } = useQuery({
    queryKey: ["inventoryMovements", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getInventoryMovements(activeRestaurantId) : null),
    enabled: !!activeRestaurantId && activeTab === "movements",
  });

  const { data: recipes, isLoading: isRecLoading } = useQuery({
    queryKey: ["recipeIngredients", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getRecipeIngredients(activeRestaurantId) : null),
    enabled: !!activeRestaurantId && activeTab === "recipes",
  });

  const { data: menuCategories } = useQuery({
    queryKey: ["menuCategories", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getCategories(activeRestaurantId) : null),
    enabled: !!activeRestaurantId && (activeTab === "recipes" || isAddRecipeOpen),
  });

  // KPI Calculations
  const totalItems = inventory?.length || 0;
  const lowStockCount = inventory?.filter((i) => i.isLowStock && !i.isOutOfStock).length || 0;
  const outOfStockCount = inventory?.filter((i) => i.isOutOfStock).length || 0;
  const totalValuationPaise =
    inventory?.reduce(
      (sum, i) => sum + Math.max(0, i.current_stock) * (i.purchase_price_paise || 0),
      0
    ) || 0;

  // Filtered inventory items
  const filteredItems = React.useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (stockFilter === "LOW") return item.isLowStock && !item.isOutOfStock;
      if (stockFilter === "OUT") return item.isOutOfStock;
      return true;
    });
  }, [inventory, searchQuery, stockFilter]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      restaurantApi.deleteInventoryItem(activeRestaurantId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", activeRestaurantId] });
      setDeletingItem(null);
    },
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) =>
      restaurantApi.deleteRecipeIngredient(activeRestaurantId!, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", activeRestaurantId] });
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant to manage inventory.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#78716C] font-semibold">
            Supply Chain & Cost Control
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Inventory & Stock Operations
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "recipes" ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddRecipeOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Map Ingredient</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddItemOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Add Stock Item</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-2xs uppercase font-bold text-[#78716C] mb-2">
            <span>Total SKUs</span>
            <Boxes className="h-4 w-4 text-[#783F24]" />
          </div>
          <div className="text-2xl font-bold text-[#29241F]">{totalItems}</div>
          <span className="text-3xs text-[#78716C]">Active inventory tracked</span>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-2xs uppercase font-bold text-[#78716C] mb-2">
            <span>Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-[#C5832B]" />
          </div>
          <div className="text-2xl font-bold text-[#C5832B]">{lowStockCount}</div>
          <span className="text-3xs text-[#78716C]">Items near reorder level</span>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-2xs uppercase font-bold text-[#78716C] mb-2">
            <span>Out of Stock</span>
            <AlertCircle className="h-4 w-4 text-[#B94A48]" />
          </div>
          <div className="text-2xl font-bold text-[#B94A48]">{outOfStockCount}</div>
          <span className="text-3xs text-[#78716C]">Replenishment required</span>
        </div>

        <div className="rounded-2xl border border-[#E7E1D8] bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-2xs uppercase font-bold text-[#78716C] mb-2">
            <span>Stock Valuation</span>
            <Layers className="h-4 w-4 text-[#2E7D32]" />
          </div>
          <div className="text-2xl font-bold text-[#29241F]">
            {formatPaiseToINR(totalValuationPaise)}
          </div>
          <span className="text-3xs text-[#78716C]">At current purchase costs</span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-[#E7E1D8] flex gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("items")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "items"
              ? "border-[#783F24] text-[#783F24]"
              : "border-transparent text-[#78716C] hover:text-[#29241F]"
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Stock Items ({totalItems})</span>
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "movements"
              ? "border-[#783F24] text-[#783F24]"
              : "border-transparent text-[#78716C] hover:text-[#29241F]"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Movement History</span>
        </button>

        <button
          onClick={() => setActiveTab("recipes")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "recipes"
              ? "border-[#783F24] text-[#783F24]"
              : "border-transparent text-[#78716C] hover:text-[#29241F]"
          }`}
        >
          <UtensilsCrossed className="h-4 w-4" />
          <span>Recipe & Auto-Deductions</span>
        </button>
      </div>

      {/* TAB 1: STOCK ITEMS */}
      {activeTab === "items" && (
        <div className="space-y-4">
          {/* Search & Stock Level Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#78716C]" />
              <input
                type="text"
                placeholder="Search by item name, SKU, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E7E1D8] bg-white pl-10 pr-4 text-xs sm:text-sm text-[#29241F] focus:border-[#783F24] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-[#E7E1D8] p-1 rounded-xl text-xs">
              <button
                onClick={() => setStockFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  stockFilter === "ALL"
                    ? "bg-[#F3E6D4] text-[#783F24] font-bold"
                    : "text-[#78716C] hover:text-[#29241F]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStockFilter("LOW")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  stockFilter === "LOW"
                    ? "bg-[#C5832B]/10 text-[#C5832B] font-bold"
                    : "text-[#78716C] hover:text-[#29241F]"
                }`}
              >
                Low Stock ({lowStockCount})
              </button>
              <button
                onClick={() => setStockFilter("OUT")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  stockFilter === "OUT"
                    ? "bg-[#B94A48]/10 text-[#B94A48] font-bold"
                    : "text-[#78716C] hover:text-[#29241F]"
                }`}
              >
                Out of Stock ({outOfStockCount})
              </button>
            </div>
          </div>

          {/* Table */}
          {isInvLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-3">
              <Boxes className="h-8 w-8 text-[#783F24] mx-auto" />
              <h3 className="text-sm font-bold text-[#29241F]">No Inventory Items Found</h3>
              <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                {searchQuery || stockFilter !== "ALL"
                  ? "No items match your active search or filter."
                  : "Start tracking raw ingredients, packaging, and stock items to automate deductions."}
              </p>
              <Button size="sm" variant="primary" onClick={() => setIsAddItemOpen(true)}>
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E7E1D8] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-bold text-3xs tracking-wider">
                      <th className="py-3 px-4">Item & SKU</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Threshold</th>
                      <th className="py-3 px-4">Cost Price</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Expiry</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E1D8]">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-sm text-[#29241F]">
                            {item.name}
                          </div>
                          <div className="text-3xs text-[#78716C] font-mono">
                            {item.sku ? `SKU: ${item.sku}` : "No SKU"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#29241F]">
                              {item.current_stock}
                            </span>
                            <span className="text-2xs text-[#78716C]">{item.unit}</span>
                            {item.isOutOfStock ? (
                              <Badge variant="danger" className="text-3xs py-0 px-1.5">
                                Out
                              </Badge>
                            ) : item.isLowStock ? (
                              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-[#C5832B]/10 text-[#C5832B] border border-[#C5832B]/30">
                                Low
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-2xs text-[#78716C]">
                          {item.low_stock_threshold} {item.unit}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-medium text-[#29241F]">
                          {item.purchase_price_paise > 0
                            ? formatPaiseToINR(item.purchase_price_paise)
                            : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-[#78716C]">
                          {item.supplier_name || "—"}
                        </td>

                        <td className="py-3.5 px-4 text-[#78716C]">
                          {item.expiry_date ? (
                            <span className="inline-flex items-center gap-1 font-mono text-3xs">
                              <Calendar className="h-3 w-3" />
                              {item.expiry_date}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2.5 text-2xs font-semibold"
                              onClick={() => setAdjustingItem(item)}
                            >
                              <ArrowUpDown className="h-3 w-3 mr-1" />
                              Adjust
                            </Button>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#FAF8F4] hover:text-[#29241F] transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#B94A48]/10 hover:text-[#B94A48] transition-colors cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOVEMENTS HISTORY */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#78716C]">
            <span>Recent stock adjustments, purchase receipts, wastage, and kitchen deductions.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["inventoryMovements", activeRestaurantId] })}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>

          {isMovLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : !movements || movements.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-3">
              <History className="h-8 w-8 text-[#783F24] mx-auto" />
              <h3 className="text-sm font-bold text-[#29241F]">No Stock Movements Recorded</h3>
              <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                Stock movements will appear here when purchases are received, wastage is logged, or orders are accepted.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E7E1D8] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-bold text-3xs tracking-wider">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Change</th>
                      <th className="py-3 px-4">Stock (Before &rarr; After)</th>
                      <th className="py-3 px-4">Reason / Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E1D8]">
                    {movements.map((mov) => {
                      const isPositive =
                        mov.movement_type === "PURCHASE" ||
                        (mov.movement_type === "ADJUSTMENT" && mov.quantity > 0);

                      return (
                        <tr key={mov.id} className="hover:bg-[#FAF8F4]/50">
                          <td className="py-3.5 px-4 font-mono text-3xs text-[#78716C]">
                            {new Date(mov.created_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-[#29241F]">
                            {mov.inventory_items?.name || "Inventory Item"}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-bold ${
                                mov.movement_type === "PURCHASE"
                                  ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                                  : mov.movement_type === "WASTAGE"
                                  ? "bg-[#B94A48]/10 text-[#B94A48]"
                                  : mov.movement_type === "ORDER_DEDUCTION"
                                  ? "bg-[#783F24]/10 text-[#783F24]"
                                  : "bg-[#78716C]/10 text-[#78716C]"
                              }`}
                            >
                              {mov.movement_type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span
                              className={
                                isPositive ? "text-[#2E7D32]" : "text-[#B94A48]"
                              }
                            >
                              {isPositive ? `+${mov.quantity}` : `-${Math.abs(mov.quantity)}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-2xs text-[#78716C]">
                            {mov.stock_before} &rarr;{" "}
                            <span className="font-bold text-[#29241F]">{mov.stock_after}</span>
                          </td>

                          <td className="py-3.5 px-4 text-[#78716C] text-2xs">
                            {mov.reason || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECIPES & INGREDIENT AUTO-DEDUCTION */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#C58B45]/20 bg-[#F3E6D4]/40 p-3.5 flex items-start gap-3 text-xs text-[#783F24]">
            <PackageCheck className="h-4 w-4 shrink-0 text-[#C58B45] mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Automated Kitchen Deductions</span>
              <span>
                Map inventory raw materials to menu items or specific portion variants.
                When a customer order or staff order is marked <strong>ACCEPTED</strong>, stock is automatically reduced atomically.
              </span>
            </div>
          </div>

          {isRecLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : !recipes || recipes.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-3">
              <UtensilsCrossed className="h-8 w-8 text-[#783F24] mx-auto" />
              <h3 className="text-sm font-bold text-[#29241F]">No Recipe Mappings Configured</h3>
              <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                Connect your dishes and variants to inventory items to track ingredient usage automatically.
              </p>
              <Button size="sm" variant="primary" onClick={() => setIsAddRecipeOpen(true)}>
                Map First Ingredient
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E7E1D8] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#E7E1D8] text-[#78716C] uppercase font-bold text-3xs tracking-wider">
                      <th className="py-3 px-4">Menu Dish</th>
                      <th className="py-3 px-4">Variant</th>
                      <th className="py-3 px-4">Deducts Inventory Item</th>
                      <th className="py-3 px-4">Quantity Required / Order</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E1D8]">
                    {recipes.map((r) => (
                      <tr key={r.id} className="hover:bg-[#FAF8F4]/50">
                        <td className="py-3.5 px-4 font-semibold text-[#29241F]">
                          {r.menu_items?.name || "Dish"}
                        </td>

                        <td className="py-3.5 px-4">
                          {r.menu_item_variants?.name ? (
                            <span className="px-2 py-0.5 rounded text-3xs font-semibold bg-[#F3E6D4] text-[#783F24]">
                              {r.menu_item_variants.name}
                            </span>
                          ) : (
                            <span className="text-2xs text-[#78716C]">Base Dish (All)</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#29241F]">
                          {r.inventory_items?.name || "Raw Material"}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-[#783F24]">
                          {r.quantity_required} {r.inventory_items?.unit || "units"}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-2xs text-[#78716C]">
                          {r.inventory_items?.current_stock ?? "—"} {r.inventory_items?.unit}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => deleteRecipeMutation.mutate(r.id)}
                            disabled={deleteRecipeMutation.isPending}
                            className="p-1.5 rounded-lg text-[#78716C] hover:bg-[#B94A48]/10 hover:text-[#B94A48] transition-colors cursor-pointer"
                            title="Delete mapping"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add / Edit Item Modal */}
      {(isAddItemOpen || editingItem) && (
        <InventoryItemModal
          isOpen={isAddItemOpen || !!editingItem}
          onClose={() => {
            setIsAddItemOpen(false);
            setEditingItem(null);
          }}
          restaurantId={activeRestaurantId}
          item={editingItem}
        />
      )}

      {/* 2. Adjust Stock Modal */}
      {adjustingItem && (
        <StockAdjustmentModal
          isOpen={!!adjustingItem}
          onClose={() => setAdjustingItem(null)}
          restaurantId={activeRestaurantId}
          item={adjustingItem}
        />
      )}

      {/* 3. Add Recipe Mapping Modal */}
      {isAddRecipeOpen && (
        <AddRecipeModal
          isOpen={isAddRecipeOpen}
          onClose={() => setIsAddRecipeOpen(false)}
          restaurantId={activeRestaurantId}
          inventoryItems={inventory || []}
        />
      )}

      {/* 4. Delete Confirmation */}
      {deletingItem && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          onConfirm={() => deleteMutation.mutate(deletingItem.id)}
          title={`Delete "${deletingItem.name}"?`}
          message="This will permanently delete this inventory item, its stock history, and any recipe mappings associated with it."
          confirmLabel="Delete Item"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Inventory Item Create / Edit Modal
// -------------------------------------------------------------
function InventoryItemModal({
  isOpen,
  onClose,
  restaurantId,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  item?: any | null;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(item);

  const [name, setName] = React.useState(item?.name || "");
  const [sku, setSku] = React.useState(item?.sku || "");
  const [currentStock, setCurrentStock] = React.useState(
    item?.current_stock !== undefined ? String(item.current_stock) : "0"
  );
  const [unit, setUnit] = React.useState(item?.unit || "kg");
  const [lowStockThreshold, setLowStockThreshold] = React.useState(
    item?.low_stock_threshold !== undefined ? String(item.low_stock_threshold) : "5"
  );
  const [purchasePriceRupees, setPurchasePriceRupees] = React.useState(
    item?.purchase_price_paise ? (item.purchase_price_paise / 100).toFixed(2) : ""
  );
  const [supplierName, setSupplierName] = React.useState(item?.supplier_name || "");
  const [expiryDate, setExpiryDate] = React.useState(item?.expiry_date || "");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        currentStock: parseFloat(currentStock) || 0,
        unit: unit.trim(),
        lowStockThreshold: parseFloat(lowStockThreshold) || 0,
        purchasePricePaise: purchasePriceRupees ? Math.round(parseFloat(purchasePriceRupees) * 100) : 0,
        supplierName: supplierName.trim() || undefined,
        expiryDate: expiryDate ? expiryDate : undefined,
      };

      if (isEditing) {
        return restaurantApi.updateInventoryItem(restaurantId, item.id, payload);
      }
      return restaurantApi.createInventoryItem(restaurantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to save inventory item");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErrorMsg(null);
    mutation.mutate();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit ${item.name}` : "Add New Stock Item"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input
              label="Item Name"
              placeholder="e.g. Basmati Rice, Paneer, Cooking Oil"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="SKU / Barcode"
              placeholder="e.g. RAW-RIC-01"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#29241F] block mb-1.5">
              Unit of Measurement
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
            >
              <option value="kg">kg (Kilograms)</option>
              <option value="g">g (Grams)</option>
              <option value="L">L (Liters)</option>
              <option value="ml">ml (Milliliters)</option>
              <option value="pcs">pcs (Pieces)</option>
              <option value="box">box (Boxes)</option>
              <option value="pack">pack (Packets)</option>
            </select>
          </div>

          <div>
            <Input
              label="Initial Stock"
              type="number"
              step="any"
              min="0"
              required
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Low Stock Threshold"
              type="number"
              step="any"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Purchase Price (₹)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={purchasePriceRupees}
              onChange={(e) => setPurchasePriceRupees(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Expiry Date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <Input
              label="Supplier / Vendor"
              placeholder="e.g. Metro Wholesale, Farm Direct"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>
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
            {isEditing ? "Save Changes" : "Create Stock Item"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// -------------------------------------------------------------
// Stock Adjustment Modal
// -------------------------------------------------------------
function StockAdjustmentModal({
  isOpen,
  onClose,
  restaurantId,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  item: any;
}) {
  const queryClient = useQueryClient();
  const [movementType, setMovementType] = React.useState<string>("PURCHASE");
  const [quantity, setQuantity] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.recordStockMovement(restaurantId, item.id, {
        movementType,
        quantity: parseFloat(quantity) || 0,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["inventoryMovements", restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to record stock movement");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setErrorMsg("Please enter a valid quantity greater than zero.");
      return;
    }
    setErrorMsg(null);
    mutation.mutate();
  };

  const isPositive = movementType === "PURCHASE" || movementType === "ADJUSTMENT";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Stock — ${item.name}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="rounded-xl bg-[#FAF8F4] border border-[#E7E1D8] p-3 text-xs flex justify-between">
          <span className="text-[#78716C]">Current Available Stock:</span>
          <span className="font-mono font-bold text-[#29241F]">
            {item.current_stock} {item.unit}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Movement Type
          </label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
          >
            <option value="PURCHASE">Stock Purchase / Addition (+)</option>
            <option value="WASTAGE">Kitchen Wastage / Spoilage (-)</option>
            <option value="DAMAGED">Damaged / Broken (-)</option>
            <option value="REDUCTION">Manual Stock Reduction (-)</option>
            <option value="ADJUSTMENT">Audit Reconciliation (+/-)</option>
          </select>
        </div>

        <Input
          label={`Quantity (${item.unit})`}
          type="number"
          step="any"
          min="0.001"
          required
          placeholder="e.g. 5"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          helperText={
            isPositive
              ? "This quantity will be added to existing stock."
              : "This quantity will be deducted from existing stock."
          }
        />

        <Input
          label="Notes / Reason (Optional)"
          placeholder="e.g. Weekly vendor delivery, batch expired, count mismatch"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

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
            Record Movement
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// -------------------------------------------------------------
// Add Recipe Ingredient Mapping Modal
// -------------------------------------------------------------
function AddRecipeModal({
  isOpen,
  onClose,
  restaurantId,
  inventoryItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  inventoryItems: any[];
}) {
  const queryClient = useQueryClient();

  const { data: menuCategories } = useQuery({
    queryKey: ["menuCategories", restaurantId],
    queryFn: () => restaurantApi.getCategories(restaurantId),
  });

  const allMenuItems = React.useMemo(() => {
    if (!menuCategories) return [];
    return menuCategories.flatMap((c) => c.menu_items || []);
  }, [menuCategories]);

  const [selectedMenuItemId, setSelectedMenuItemId] = React.useState<string>(
    allMenuItems[0]?.id || ""
  );
  const [selectedVariantId, setSelectedVariantId] = React.useState<string>("");
  const [selectedInventoryItemId, setSelectedInventoryItemId] = React.useState<string>(
    inventoryItems[0]?.id || ""
  );
  const [quantityRequired, setQuantityRequired] = React.useState("1");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // When selected menu item changes, check its variants
  const activeMenuItem = allMenuItems.find((m) => m.id === selectedMenuItemId);
  const itemVariants = (activeMenuItem as any)?.variants || [];

  const mutation = useMutation({
    mutationFn: () =>
      restaurantApi.mapRecipeIngredient(restaurantId, {
        menuItemId: selectedMenuItemId,
        variantId: selectedVariantId ? selectedVariantId : null,
        inventoryItemId: selectedInventoryItemId,
        quantityRequired: parseFloat(quantityRequired) || 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeIngredients", restaurantId] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create recipe mapping");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuItemId || !selectedInventoryItemId) return;
    setErrorMsg(null);
    mutation.mutate();
  };

  const selectedInventoryItem = inventoryItems.find((i) => i.id === selectedInventoryItemId);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Map Ingredient to Menu Dish"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Select Menu Dish
          </label>
          <select
            value={selectedMenuItemId}
            onChange={(e) => {
              setSelectedMenuItemId(e.target.value);
              setSelectedVariantId("");
            }}
            className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
          >
            {allMenuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {itemVariants.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29241F]">
              Portion / Variant (Optional)
            </label>
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
            >
              <option value="">Apply to Base Dish (All portions)</option>
              {itemVariants.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Inventory Item to Deduct
          </label>
          <select
            value={selectedInventoryItemId}
            onChange={(e) => setSelectedInventoryItemId(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
          >
            {inventoryItems.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name} (Stock: {inv.current_stock} {inv.unit})
              </option>
            ))}
          </select>
        </div>

        <Input
          label={`Quantity to Deduct (${selectedInventoryItem?.unit || "units"})`}
          type="number"
          step="any"
          min="0.001"
          required
          placeholder="e.g. 0.25"
          value={quantityRequired}
          onChange={(e) => setQuantityRequired(e.target.value)}
          helperText="Deducted per unit ordered when order status transitions to ACCEPTED."
        />

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
            Save Recipe Mapping
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

