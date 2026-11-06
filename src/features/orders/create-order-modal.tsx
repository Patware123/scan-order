"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Utensils,
  Package,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  Search,
  ShoppingBag,
  Flame,
  Clock,
  Check,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  restaurantApi,
  MenuItemData,
  CategoryData,
  RestaurantTable,
} from "@/services/api/restaurant.api";
import { formatPaiseToINR } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
}

interface CartItem {
  id: string; // unique identifier (menuItemId + variantId)
  menuItemId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  unitPricePaise: number;
  quantity: number;
  taxRatePercentage: number;
  imageUrl?: string | null;
}

export function CreateOrderModal({
  isOpen,
  onClose,
  restaurantId,
}: CreateOrderModalProps) {
  const queryClient = useQueryClient();

  // Tab State: "TABLE" (DINE_IN) or "PARCEL" (TAKEAWAY)
  const [activeTab, setActiveTab] = React.useState<"TABLE" | "PARCEL">("TABLE");

  // Form Fields
  const [selectedTableId, setSelectedTableId] = React.useState<string>("");
  const [customerName, setCustomerName] = React.useState<string>("");
  const [customerPhone, setCustomerPhone] = React.useState<string>("");
  const [specialInstructions, setSpecialInstructions] = React.useState<string>("");

  // Cart State
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);

  // Menu Search & Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [dietaryFilter, setDietaryFilter] = React.useState<"ALL" | "VEG" | "NON_VEG">("ALL");

  // Selected variant map per menu item: { [menuItemId]: variantId }
  const [selectedVariants, setSelectedVariants] = React.useState<Record<string, string>>({});

  const [formError, setFormError] = React.useState<string | null>(null);

  // 1. Fetch Tables
  const { data: tables = [] } = useQuery<RestaurantTable[]>({
    queryKey: ["restaurantTables", restaurantId],
    queryFn: () => restaurantApi.getTables(restaurantId),
    enabled: isOpen && !!restaurantId,
  });

  // 2. Fetch Menu Items
  const { data: menuItems = [], isLoading: isMenuLoading } = useQuery<MenuItemData[]>({
    queryKey: ["menuItems", restaurantId],
    queryFn: () => restaurantApi.getMenuItems(restaurantId),
    enabled: isOpen && !!restaurantId,
  });

  // 3. Fetch Categories
  const { data: categories = [] } = useQuery<CategoryData[]>({
    queryKey: ["menuCategories", restaurantId],
    queryFn: () => restaurantApi.getCategories(restaurantId),
    enabled: isOpen && !!restaurantId,
  });

  // 4. Fetch Restaurant Charges
  const { data: charges = [] } = useQuery({
    queryKey: ["restaurantCharges", restaurantId, activeTab === "TABLE" ? "DINE_IN" : "PARCEL"],
    queryFn: () =>
      restaurantApi.getCharges(restaurantId, activeTab === "TABLE" ? "DINE_IN" : "PARCEL"),
    enabled: isOpen && !!restaurantId,
  });

  // Available (unlocked & active) tables for Dine-In
  const availableTables = tables.filter((t) => t.is_active && !t.is_locked);

  // Check available dietary types in this restaurant's menu
  const hasVegItems = React.useMemo(() => {
    return menuItems.some(
      (item) => item.is_available && (item.is_veg === true || item.dietary_type === "VEG" || item.dietary_type === "VEGAN")
    );
  }, [menuItems]);

  const hasNonVegItems = React.useMemo(() => {
    return menuItems.some(
      (item) => item.is_available && (item.is_veg === false || item.dietary_type === "NON_VEG" || item.dietary_type === "EGG")
    );
  }, [menuItems]);

  // Filtered Menu Items
  const filteredMenuItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      // Must be available for ordering
      if (!item.is_available) return false;

      // Category filter
      if (selectedCategory !== "ALL" && item.category_id !== selectedCategory) {
        return false;
      }

      // Dietary filter
      const isVeg = item.is_veg === true || item.dietary_type === "VEG" || item.dietary_type === "VEGAN";
      if (dietaryFilter === "VEG" && !isVeg) return false;
      if (dietaryFilter === "NON_VEG" && isVeg) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery]);

  // Set default variants when items load
  React.useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const item of menuItems) {
      const itemVariants = (item as any).variants || [];
      if (itemVariants.length > 0 && !selectedVariants[item.id]) {
        // Default to first available variant
        const firstAvail = itemVariants.find((v: any) => v.is_available) || itemVariants[0];
        if (firstAvail) {
          defaults[item.id] = firstAvail.id;
        }
      }
    }
    if (Object.keys(defaults).length > 0) {
      setSelectedVariants((prev) => ({ ...defaults, ...prev }));
    }
  }, [menuItems, selectedVariants]);

  // Add Item / Variant to Cart
  const handleAddToCart = (item: MenuItemData) => {
    setFormError(null);
    const itemVariants = ((item as any).variants || []) as Array<{
      id: string;
      name: string;
      price_paise: number;
      is_available: boolean;
    }>;

    let variantId: string | null = null;
    let variantName: string | null = null;
    let unitPricePaise = item.price_paise;

    if (itemVariants.length > 0) {
      const activeVariantId = selectedVariants[item.id] || itemVariants[0]?.id;
      const variantObj = itemVariants.find((v) => v.id === activeVariantId);
      if (variantObj) {
        variantId = variantObj.id;
        variantName = variantObj.name;
        unitPricePaise = variantObj.price_paise;
      }
    }

    const cartKey = `${item.id}-${variantId || "standard"}`;

    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.id === cartKey);
      if (existing) {
        return prev.map((ci) =>
          ci.id === cartKey ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [
        ...prev,
        {
          id: cartKey,
          menuItemId: item.id,
          variantId,
          name: item.name,
          variantName,
          unitPricePaise,
          quantity: 1,
          taxRatePercentage: Number((item as any).tax_rate_percentage || 5.0),
          imageUrl: item.image_url,
        },
      ];
    });
  };

  const handleUpdateQuantity = (cartKey: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (cartKey: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartKey));
  };

  // Calculations
  const subtotalPaise = cartItems.reduce(
    (sum, i) => sum + i.unitPricePaise * i.quantity,
    0
  );

  const taxPaise = cartItems.reduce((sum, i) => {
    const lineTotal = i.unitPricePaise * i.quantity;
    return sum + Math.round((lineTotal * i.taxRatePercentage) / 100);
  }, 0);

  const additionalChargesPaise = charges.reduce((sum, ch) => {
    if (!ch.is_active) return sum;
    if (ch.charge_type === "PERCENTAGE") {
      return sum + Math.round((subtotalPaise * Number(ch.rate_or_amount)) / 100);
    }
    return sum + Math.round(Number(ch.rate_or_amount));
  }, 0);

  const grandTotalPaise = subtotalPaise + taxPaise + additionalChargesPaise;

  // Staff Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: (payload: {
      orderType: "DINE_IN" | "PARCEL";
      tableId?: string | null;
      customerName?: string | null;
      customerPhone?: string | null;
      specialInstructions?: string | null;
      items: Array<{ menuItemId: string; variantId?: string | null; quantity: number }>;
    }) => restaurantApi.createStaffOrder(restaurantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantOrders", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurantTables", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["dailyReport", restaurantId] });
      handleReset();
      onClose();
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create order");
    },
  });

  const handleReset = () => {
    setSelectedTableId("");
    setCustomerName("");
    setCustomerPhone("");
    setSpecialInstructions("");
    setCartItems([]);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cartItems.length === 0) {
      setFormError("Please add at least one dish to the cart before placing the order.");
      return;
    }

    if (activeTab === "TABLE" && !selectedTableId) {
      setFormError("Please select an available dining table for this Table Order.");
      return;
    }

    createOrderMutation.mutate({
      orderType: activeTab === "TABLE" ? "DINE_IN" : "PARCEL",
      tableId: activeTab === "TABLE" ? selectedTableId : null,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      specialInstructions: specialInstructions.trim() || null,
      items: cartItems.map((i) => ({
        menuItemId: i.menuItemId,
        variantId: i.variantId || null,
        quantity: i.quantity,
      })),
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Order for Customer"
      className="max-w-5xl sm:max-w-6xl w-full p-0 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-[85vh] max-h-[820px]">
        {/* Error Banner */}
        {formError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-[#B94A48]/10 border border-[#B94A48]/30 text-xs text-[#B94A48] flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Dual-Pane POS Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#E7E1D8]">
          {/* ========================================================================= */}
          {/* LEFT PANE: Menu Items Catalog (7 cols on lg screens)                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col h-full bg-[#FAF8F4]/50 overflow-hidden">
            {/* Top Search & Filter Bar */}
            <div className="p-3.5 border-b border-[#E7E1D8] bg-white space-y-2.5 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#78716C]" />
                <input
                  type="text"
                  placeholder="Search dishes by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] pl-9 pr-3 text-xs text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Category Pills & Dietary Switcher */}
              <div className="flex items-center justify-between gap-2">
                {/* Category Pills */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[70%]">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === "ALL"
                        ? "bg-[#783F24] text-white"
                        : "bg-[#FAF8F4] text-[#78716C] hover:bg-[#E7E1D8]/60"
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-[#783F24] text-white"
                          : "bg-[#FAF8F4] text-[#78716C] hover:bg-[#E7E1D8]/60"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Dietary Filter Buttons or Pure Badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {hasVegItems && !hasNonVegItems ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#557A52]/10 text-[#557A52] border border-[#557A52]/30 text-2xs font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#557A52]" />
                      <span>100% Veg</span>
                    </div>
                  ) : !hasVegItems && hasNonVegItems ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#B94A48]/10 text-[#B94A48] border border-[#B94A48]/30 text-2xs font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#B94A48]" />
                      <span>Non-Veg Only</span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setDietaryFilter(dietaryFilter === "VEG" ? "ALL" : "VEG")
                        }
                        className={`px-2 py-1 rounded-lg text-2xs font-bold border transition-colors cursor-pointer ${
                          dietaryFilter === "VEG"
                            ? "bg-[#557A52] text-white border-[#557A52]"
                            : "bg-white text-[#557A52] border-[#557A52]/30 hover:bg-[#557A52]/10"
                        }`}
                      >
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDietaryFilter(dietaryFilter === "NON_VEG" ? "ALL" : "NON_VEG")
                        }
                        className={`px-2 py-1 rounded-lg text-2xs font-bold border transition-colors cursor-pointer ${
                          dietaryFilter === "NON_VEG"
                            ? "bg-[#B94A48] text-white border-[#B94A48]"
                            : "bg-white text-[#B94A48] border-[#B94A48]/30 hover:bg-[#B94A48]/10"
                        }`}
                      >
                        Non-Veg
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {isMenuLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-32 rounded-2xl bg-white border border-[#E7E1D8] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#E7E1D8] p-6">
                  <p className="text-xs font-semibold text-[#29241F]">
                    No dishes found matching your search.
                  </p>
                  <p className="text-2xs text-[#78716C] mt-1">
                    Try searching for another keyword or clearing dietary filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMenuItems.map((item) => {
                    const isVeg =
                      item.is_veg === true || item.dietary_type === "VEG" || item.dietary_type === "VEGAN";
                    const itemVariants = ((item as any).variants || []) as Array<{
                      id: string;
                      name: string;
                      price_paise: number;
                      is_available: boolean;
                    }>;
                    const hasVariants = itemVariants.length > 0;
                    const currentVariantId = selectedVariants[item.id] || itemVariants[0]?.id;
                    const activeVariant = itemVariants.find((v) => v.id === currentVariantId);
                    const currentCartKey = `${item.id}-${currentVariantId || "standard"}`;
                    const cartEntry = cartItems.find((ci) => ci.id === currentCartKey);

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#E7E1D8] overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                      >
                        {/* Top Hero Banner (if image available) */}
                        {item.image_url ? (
                          <div className="relative w-full h-28 overflow-hidden bg-[#FAF8F4]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                              }}
                            />
                            {/* Veg / Non-Veg dot */}
                            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-black/5 flex items-center gap-1 shadow-2xs">
                              <span
                                className={`h-2 w-2 rounded-xs flex items-center justify-center border ${
                                  isVeg ? "border-[#557A52]" : "border-[#B94A48]"
                                }`}
                              >
                                <span
                                  className={`h-1 w-1 rounded-full ${
                                    isVeg ? "bg-[#557A52]" : "bg-[#B94A48]"
                                  }`}
                                />
                              </span>
                              <span className="text-3xs font-bold text-[#29241F]">
                                {isVeg ? "VEG" : "NON-VEG"}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {/* Card Content */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            {!item.image_url && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <span
                                  className={`h-2.5 w-2.5 rounded-xs flex items-center justify-center border ${
                                    isVeg ? "border-[#557A52]" : "border-[#B94A48]"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      isVeg ? "bg-[#557A52]" : "bg-[#B94A48]"
                                    }`}
                                  />
                                </span>
                                <span className="text-3xs font-bold uppercase text-[#78716C]">
                                  {isVeg ? "Veg" : "Non-Veg"}
                                </span>
                              </div>
                            )}

                            <h4 className="text-xs sm:text-sm font-bold text-[#29241F] leading-snug line-clamp-1">
                              {item.name}
                            </h4>

                            {item.description && (
                              <p className="text-3xs text-[#78716C] line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Variants Pills (if any) */}
                          {hasVariants && (
                            <div className="space-y-1 pt-1">
                              <span className="text-3xs font-semibold text-[#78716C] block">
                                Portion / Size:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {itemVariants.map((v) => (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedVariants((prev) => ({
                                        ...prev,
                                        [item.id]: v.id,
                                      }))
                                    }
                                    className={`px-2 py-0.5 rounded-lg text-3xs font-bold border transition-colors cursor-pointer ${
                                      currentVariantId === v.id
                                        ? "bg-[#783F24] text-white border-[#783F24]"
                                        : "bg-[#FAF8F4] text-[#29241F] border-[#E7E1D8] hover:bg-[#F3E6D4]/40"
                                    }`}
                                  >
                                    {v.name} ({formatPaiseToINR(v.price_paise)})
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Price & Action Row */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#FAF8F4]">
                            <span className="text-xs sm:text-sm font-bold text-[#783F24]">
                              {hasVariants
                                ? formatPaiseToINR(activeVariant?.price_paise || item.price_paise)
                                : formatPaiseToINR(item.price_paise)}
                            </span>

                            {cartEntry ? (
                              <div className="flex items-center gap-1.5 bg-[#FAF8F4] border border-[#E7E1D8] rounded-xl px-2 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(currentCartKey, -1)}
                                  className="text-[#78716C] hover:text-[#783F24] p-0.5 cursor-pointer"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold text-[#29241F] min-w-[14px] text-center">
                                  {cartEntry.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(currentCartKey, 1)}
                                  className="text-[#78716C] hover:text-[#783F24] p-0.5 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddToCart(item)}
                                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#783F24] text-white text-xs font-bold hover:bg-[#63331D] cursor-pointer shadow-2xs transition-transform active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT PANE: Order Cart & Details (5 cols on lg screens)                   */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col h-full bg-white overflow-hidden">
            {/* Top Order Type Selector */}
            <div className="p-3.5 border-b border-[#E7E1D8] space-y-3 shrink-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF8F4] rounded-2xl border border-[#E7E1D8]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("TABLE");
                    setFormError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "TABLE"
                      ? "bg-[#783F24] text-white shadow-xs"
                      : "text-[#78716C] hover:text-[#29241F]"
                  }`}
                >
                  <Utensils className="h-3.5 w-3.5" />
                  <span>Table Order (Dine-In)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("PARCEL");
                    setFormError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "PARCEL"
                      ? "bg-[#783F24] text-white shadow-xs"
                      : "text-[#78716C] hover:text-[#29241F]"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Parcel (Takeaway)</span>
                </button>
              </div>

              {/* Table Picker or Customer Contact Info */}
              {activeTab === "TABLE" ? (
                <div>
                  <label className="text-2xs font-bold text-[#29241F] mb-1 block uppercase tracking-wider">
                    Select Available Table *
                  </label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E7E1D8] px-3 text-xs text-[#29241F] bg-white focus:border-[#783F24] focus:outline-none"
                    required={activeTab === "TABLE"}
                  >
                    <option value="">-- Choose Dining Table --</option>
                    {availableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.label || t.table_number} ({t.capacity} guests)
                      </option>
                    ))}
                  </select>
                  {availableTables.length === 0 && (
                    <p className="text-3xs text-[#B94A48] mt-1">
                      No tables currently available. Clear a table or choose Parcel Order.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-3xs font-bold text-[#78716C] block uppercase tracking-wider mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full h-8 rounded-xl border border-[#E7E1D8] px-2.5 text-xs text-[#29241F]"
                    />
                  </div>
                  <div>
                    <label className="text-3xs font-bold text-[#78716C] block uppercase tracking-wider mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-8 rounded-xl border border-[#E7E1D8] px-2.5 text-xs text-[#29241F]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#FAF8F4]">
                <span className="text-xs font-bold text-[#29241F]">
                  Order Cart ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)
                </span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="text-3xs text-[#B94A48] hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-10 px-4 text-[#78716C]">
                  <ShoppingBag className="h-8 w-8 mx-auto text-[#D6CEBF] mb-2" />
                  <p className="text-xs font-semibold text-[#29241F]">Your cart is empty</p>
                  <p className="text-3xs mt-1">
                    Click any item on the left menu catalog to add dishes to this order.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 divide-y divide-[#FAF8F4]">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="pt-2 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-[#29241F] truncate">{item.name}</p>
                        {item.variantName && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-md bg-[#FAF8F4] border border-[#E7E1D8] text-3xs text-[#783F24] font-bold">
                            {item.variantName}
                          </span>
                        )}
                        <span className="text-3xs text-[#78716C] block">
                          {formatPaiseToINR(item.unitPricePaise)} each
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 bg-[#FAF8F4] border border-[#E7E1D8] rounded-xl px-2 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="text-[#78716C] hover:text-[#783F24] p-0.5 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-[#29241F] min-w-[14px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="text-[#78716C] hover:text-[#783F24] p-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="font-bold text-xs text-[#29241F] min-w-[50px] text-right">
                          {formatPaiseToINR(item.unitPricePaise * item.quantity)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-[#78716C] hover:text-[#B94A48] p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Instructions & Bill Summary & Place Order Action */}
            <div className="p-3.5 border-t border-[#E7E1D8] bg-[#FAF8F4]/60 space-y-2.5 shrink-0">
              {/* Special Cooking Instructions */}
              <div>
                <input
                  type="text"
                  placeholder="Special instructions (e.g. Less spicy, extra sauce)..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full h-8 rounded-xl border border-[#E7E1D8] bg-white px-3 text-2xs text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none"
                />
              </div>

              {/* Price Breakdown */}
              {cartItems.length > 0 && (
                <div className="space-y-1 text-2xs text-[#78716C] pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPaiseToINR(subtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes (GST)</span>
                    <span>{formatPaiseToINR(taxPaise)}</span>
                  </div>
                  {charges.map((ch) => (
                    <div key={ch.id} className="flex justify-between">
                      <span>
                        {ch.name}{" "}
                        {ch.charge_type === "PERCENTAGE" && `(${ch.rate_or_amount}%)`}
                      </span>
                      <span>
                        {formatPaiseToINR(
                          ch.charge_type === "PERCENTAGE"
                            ? Math.round((subtotalPaise * Number(ch.rate_or_amount)) / 100)
                            : Math.round(Number(ch.rate_or_amount))
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-extrabold text-sm text-[#29241F] pt-1.5 border-t border-[#E7E1D8]">
                    <span>Total Bill</span>
                    <span className="text-[#783F24]">{formatPaiseToINR(grandTotalPaise)}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createOrderMutation.isPending}
                  disabled={
                    cartItems.length === 0 ||
                    (activeTab === "TABLE" && !selectedTableId) ||
                    createOrderMutation.isPending
                  }
                  className="flex-2 font-bold"
                >
                  Place Order for Customer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
