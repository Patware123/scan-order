"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  FolderPlus,
  Clock,
  Flame,
  Upload,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import {
  restaurantApi,
  MenuItemData,
  CategoryData,
} from "@/services/api/restaurant.api";
import { formatPaiseToINR, rupeesToPaise, paiseToRupees } from "@/lib/utils/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function MenuManagementPage() {
  const queryClient = useQueryClient();
  const { activeRestaurantId } = useAuth();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MenuItemData | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryData | null>(null);

  const [deleteItemTarget, setDeleteItemTarget] = React.useState<MenuItemData | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = React.useState<CategoryData | null>(null);

  // Queries
  const { data: categories, isLoading: isCatLoading } = useQuery({
    queryKey: ["categories", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getCategories(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
  });

  const { data: menuItems, isLoading: isItemsLoading } = useQuery({
    queryKey: ["menuItems", activeRestaurantId],
    queryFn: () => (activeRestaurantId ? restaurantApi.getMenuItems(activeRestaurantId) : null),
    enabled: !!activeRestaurantId,
  });

  // Toggle availability mutation
  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      restaurantApi.toggleItemAvailability(activeRestaurantId!, itemId, isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems", activeRestaurantId] });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      restaurantApi.deleteMenuItem(activeRestaurantId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems", activeRestaurantId] });
      setDeleteItemTarget(null);
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (catId: string) =>
      restaurantApi.deleteCategory(activeRestaurantId!, catId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", activeRestaurantId] });
      setDeleteCategoryTarget(null);
    },
  });

  if (!activeRestaurantId) {
    return (
      <div className="p-8 text-center text-[#78716C] bg-white rounded-3xl border border-[#E7E1D8]">
        Please select a restaurant first.
      </div>
    );
  }

  // Filter items
  const filteredItems = (menuItems || []).filter((item) => {
    if (selectedCategory !== "ALL" && item.category_id !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) {
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
            Catalog Management
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29241F]">
            Menu & Categories
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingCategory(null);
              setIsCategoryModalOpen(true);
            }}
          >
            <FolderPlus className="h-4 w-4 mr-1.5 text-[#783F24]" />
            <span>Add Category</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Add Menu Item</span>
          </Button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="bg-white border border-[#E7E1D8] rounded-2xl p-3.5 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold uppercase tracking-wider text-[#78716C]">
            Categories ({categories?.length || 0})
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-[#783F24] text-white"
                : "bg-[#FAF8F4] text-[#78716C] hover:bg-[#F3E6D4]/50"
            }`}
          >
            All Items ({menuItems?.length || 0})
          </button>
          {categories?.map((cat) => {
            const count = (menuItems || []).filter((i) => i.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <div
                key={cat.id}
                className={`group flex items-center rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-[#783F24] text-white border-[#783F24]"
                    : "bg-[#FAF8F4] text-[#78716C] border-[#E7E1D8] hover:bg-[#F3E6D4]/50"
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className="px-3 py-1.5 cursor-pointer"
                >
                  {cat.name} ({count})
                </button>
                <button
                  onClick={() => {
                    setEditingCategory(cat);
                    setIsCategoryModalOpen(true);
                  }}
                  className={`p-1 mr-1 rounded-md opacity-60 hover:opacity-100 cursor-pointer ${
                    isSelected ? "hover:bg-white/20" : "hover:bg-[#E7E1D8]"
                  }`}
                  title="Edit Category"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search items by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-xl border border-[#E7E1D8] bg-white pl-9 pr-3 text-xs text-[#29241F] placeholder:text-[#A8A29E] focus:border-[#783F24] focus:outline-none"
          />
        </div>
        <span className="text-xs text-[#78716C]">
          Showing {filteredItems.length} items
        </span>
      </div>

      {/* Items Grid */}
      {isItemsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl bg-white border border-[#E7E1D8] p-12 text-center space-y-3">
          <UtensilsCrossed className="h-8 w-8 text-[#78716C] mx-auto" />
          <h3 className="text-sm font-bold text-[#29241F]">No Menu Items Found</h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            Get started by adding dishes, beverages, and appetizers to your digital menu.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
          >
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isVeg = item.dietary_type === "VEG" || item.dietary_type === "VEGAN";
            const categoryName =
              categories?.find((c) => c.id === item.category_id)?.name || "Uncategorized";

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-xs flex flex-col justify-between transition-all ${
                  item.is_available ? "border-[#E7E1D8]" : "border-[#E7E1D8] opacity-70"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`h-2.5 w-2.5 rounded-xs flex items-center justify-center border ${
                            isVeg
                              ? "border-[#557A52] text-[#557A52]"
                              : "border-[#B94A48] text-[#B94A48]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isVeg ? "bg-[#557A52]" : "bg-[#B94A48]"
                            }`}
                          />
                        </span>
                        <span className="text-3xs font-semibold uppercase text-[#78716C] truncate">
                          {categoryName}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#29241F] leading-snug">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-[#78716C] line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {item.image_url && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#E7E1D8] bg-[#FAF8F4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-2xs text-[#78716C]">
                    {item.spice_level ? (
                      <span className="flex items-center gap-0.5 text-[#B77932]">
                        <Flame className="h-3 w-3" />
                        {item.spice_level > 1 ? "Spicy" : "Mild"}
                      </span>
                    ) : null}
                    {item.preparation_time_minutes ? (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {item.preparation_time_minutes}m prep
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#FAF8F4]">
                  <span className="text-base font-bold text-[#783F24]">
                    {formatPaiseToINR(item.price_paise)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Availability Toggle Button */}
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          itemId: item.id,
                          isAvailable: !item.is_available,
                        })
                      }
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-semibold transition-colors cursor-pointer ${
                        item.is_available
                          ? "bg-[#557A52]/10 text-[#557A52] hover:bg-[#557A52]/20"
                          : "bg-[#B94A48]/10 text-[#B94A48] hover:bg-[#B94A48]/20"
                      }`}
                      title="Toggle Item Availability"
                    >
                      {item.is_available ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Sold Out</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsItemModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#E7E1D8] text-[#78716C] hover:text-[#29241F] hover:bg-[#FAF8F4] cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteItemTarget(item)}
                      className="p-1.5 rounded-lg border border-[#E7E1D8] text-[#78716C] hover:text-[#B94A48] hover:bg-[#B94A48]/10 cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Modal (Create / Edit) */}
      {isItemModalOpen && (
        <MenuItemModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          restaurantId={activeRestaurantId}
          categories={categories || []}
          initialItem={editingItem}
        />
      )}

      {/* Category Modal (Create / Edit) */}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          restaurantId={activeRestaurantId}
          initialCategory={editingCategory}
          onDelete={(cat) => {
            setIsCategoryModalOpen(false);
            setDeleteCategoryTarget(cat);
          }}
        />
      )}

      {/* Delete Item Confirmation */}
      {deleteItemTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeleteItemTarget(null)}
          onConfirm={() => deleteItemMutation.mutate(deleteItemTarget.id)}
          title={`Delete "${deleteItemTarget.name}"?`}
          message="Are you sure you want to delete this menu item? It will be removed from customer digital menus."
          confirmLabel="Delete Item"
          variant="danger"
          isLoading={deleteItemMutation.isPending}
        />
      )}

      {/* Delete Category Confirmation */}
      {deleteCategoryTarget && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeleteCategoryTarget(null)}
          onConfirm={() => deleteCategoryMutation.mutate(deleteCategoryTarget.id)}
          title={`Delete Category "${deleteCategoryTarget.name}"?`}
          message="Are you sure you want to delete this category? Items in this category will become uncategorized."
          confirmLabel="Delete Category"
          variant="danger"
          isLoading={deleteCategoryMutation.isPending}
        />
      )}
    </div>
  );
}

// Modal component for creating/editing menu items
function MenuItemModal({
  isOpen,
  onClose,
  restaurantId,
  categories,
  initialItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  categories: CategoryData[];
  initialItem: MenuItemData | null;
}) {
  const queryClient = useQueryClient();

  const [name, setName] = React.useState(initialItem?.name || "");
  const [categoryId, setCategoryId] = React.useState(
    initialItem?.category_id || categories[0]?.id || ""
  );
  const [description, setDescription] = React.useState(initialItem?.description || "");
  const [rupees, setRupees] = React.useState(
    initialItem ? paiseToRupees(initialItem.price_paise).toString() : ""
  );
  const [dietaryType, setDietaryType] = React.useState<MenuItemData["dietary_type"]>(
    initialItem?.dietary_type || "VEG"
  );
  const [imageUrl, setImageUrl] = React.useState(initialItem?.image_url || "");
  const [spiceLevel, setSpiceLevel] = React.useState(initialItem?.spice_level?.toString() || "0");
  const [prepTime, setPrepTime] = React.useState(
    initialItem?.preparation_time_minutes?.toString() || "15"
  );
  const [isUploading, setIsUploading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const pricePaise = rupeesToPaise(parseFloat(rupees) || 0);
      const payload: Partial<MenuItemData> = {
        name,
        category_id: categoryId,
        description: description || undefined,
        price_paise: pricePaise,
        dietary_type: dietaryType,
        image_url: imageUrl || undefined,
        spice_level: parseInt(spiceLevel) || 0,
        preparation_time_minutes: parseInt(prepTime) || 15,
      };

      if (initialItem) {
        return restaurantApi.updateMenuItem(restaurantId, initialItem.id, payload);
      } else {
        return restaurantApi.createMenuItem(restaurantId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems", restaurantId] });
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to save item.");
    },
  });

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const url = await restaurantApi.uploadMenuImage(restaurantId, file);
      setImageUrl(url);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rupees || !categoryId) {
      setErrorMsg("Name, category, and price are required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialItem ? "Edit Menu Item" : "Create Menu Item"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Item Name"
          placeholder="e.g. Paneer Butter Masala"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29241F]">
              Category <span className="text-[#B94A48]">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F] focus:border-[#783F24] focus:outline-none"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Price in ₹"
            type="number"
            step="0.01"
            min="0"
            placeholder="250.00"
            required
            value={rupees}
            onChange={(e) => setRupees(e.target.value)}
            helperText="Stored in integer paise"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Dietary Preference
          </label>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {(["VEG", "NON_VEG", "VEGAN", "EGG"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setDietaryType(type)}
                className={`p-2 rounded-xl border text-center font-semibold cursor-pointer ${
                  dietaryType === type
                    ? "bg-[#783F24] text-white border-[#783F24]"
                    : "bg-[#FAF8F4] text-[#78716C] border-[#E7E1D8]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Ingredients, preparation style, notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[#E7E1D8] p-2.5 text-xs text-[#29241F] focus:border-[#783F24] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29241F]">
              Spice Level (0 to 3)
            </label>
            <select
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#E7E1D8] bg-white px-3 text-xs sm:text-sm text-[#29241F]"
            >
              <option value="0">0 - Not Spicy</option>
              <option value="1">1 - Mild</option>
              <option value="2">2 - Medium</option>
              <option value="3">3 - Extra Hot</option>
            </select>
          </div>

          <Input
            label="Prep Time (Minutes)"
            type="number"
            min="1"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
          />
        </div>

        {/* Image Upload / URL */}
        <div className="space-y-2 pt-1 border-t border-[#FAF8F4]">
          <label className="text-xs font-semibold text-[#29241F]">
            Item Image
          </label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Preview"
                className="h-12 w-12 rounded-xl object-cover border border-[#E7E1D8]"
              />
            ) : null}
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] text-xs font-semibold text-[#783F24] hover:bg-[#F3E6D4]/50 cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>{isUploading ? "Uploading..." : "Upload New Image"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleImageFile}
              />
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={mutation.isPending || isUploading}
          >
            {initialItem ? "Save Changes" : "Create Item"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Modal component for creating/editing categories
function CategoryModal({
  isOpen,
  onClose,
  restaurantId,
  initialCategory,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  initialCategory: CategoryData | null;
  onDelete: (cat: CategoryData) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState(initialCategory?.name || "");
  const [description, setDescription] = React.useState(initialCategory?.description || "");
  const [displayOrder, setDisplayOrder] = React.useState(
    initialCategory?.display_order?.toString() || "0"
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || undefined,
        display_order: parseInt(displayOrder) || 0,
      };
      if (initialCategory) {
        return restaurantApi.updateCategory(restaurantId, initialCategory.id, payload);
      } else {
        return restaurantApi.createCategory(restaurantId, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", restaurantId] });
      onClose();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to save category.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setErrorMsg("Category name is required.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialCategory ? "Edit Category" : "Add Menu Category"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Category Name"
          placeholder="e.g. Starters, Biryani, Desserts"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#29241F]">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Category summary for diners..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-[#E7E1D8] p-2 text-xs text-[#29241F]"
          />
        </div>

        <Input
          label="Display Order"
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          helperText="Lower numbers appear first on customer menus"
        />

        {errorMsg && (
          <div className="rounded-xl border border-[#B94A48]/30 bg-[#B94A48]/10 p-3 text-xs text-[#B94A48]">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {initialCategory ? (
            <button
              type="button"
              onClick={() => onDelete(initialCategory)}
              className="text-xs font-semibold text-[#B94A48] hover:underline cursor-pointer"
            >
              Delete Category
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={mutation.isPending}>
              {initialCategory ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
