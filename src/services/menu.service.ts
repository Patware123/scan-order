import { createAdminClient } from "@/lib/supabase/admin";
import {
  CategoryInput,
  UpdateCategoryInput,
  MenuItemInput,
  UpdateMenuItemInput,
} from "@/lib/validations/menu.schema";
import { NotFoundError, BadRequestError } from "@/lib/utils/errors";

export async function getCategories(
  restaurantId: string,
  includeInactive = false
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw new BadRequestError(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}

export async function createCategory(
  restaurantId: string,
  input: CategoryInput
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("menu_categories")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to create category: ${error?.message}`);
  }

  return data;
}

export async function updateCategory(
  restaurantId: string,
  categoryId: string,
  input: UpdateCategoryInput
) {
  const adminClient = createAdminClient();

  const updateData: {
    name?: string;
    sort_order?: number;
    is_active?: boolean;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await adminClient
    .from("menu_categories")
    .update(updateData)
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Category not found or update failed");
  }

  return data;
}

export async function deleteCategory(
  restaurantId: string,
  categoryId: string
) {
  const adminClient = createAdminClient();

  // Check if any menu items reference this category
  const { count } = await adminClient
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  if (count && count > 0) {
    throw new BadRequestError(
      `Cannot delete category containing ${count} items. Reassign or delete items first.`
    );
  }

  const { error } = await adminClient
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to delete category: ${error.message}`);
  }

  return { success: true };
}

export async function reorderCategories(
  restaurantId: string,
  items: { id: string; sortOrder: number }[]
) {
  const adminClient = createAdminClient();

  for (const item of items) {
    await adminClient
      .from("menu_categories")
      .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("restaurant_id", restaurantId);
  }

  return { success: true };
}

export async function getMenuItems(
  restaurantId: string,
  options?: {
    categoryId?: string;
    isAvailable?: boolean;
    isVeg?: boolean;
    search?: string;
  }
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("menu_items")
    .select(`
      *,
      menu_categories (id, name),
      menu_item_images (*)
    `)
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (options?.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (typeof options?.isAvailable === "boolean") {
    query = query.eq("is_available", options.isAvailable);
  }

  if (typeof options?.isVeg === "boolean") {
    query = query.eq("is_veg", options.isVeg);
  }

  if (options?.search) {
    query = query.ilike("name", `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new BadRequestError(`Failed to fetch menu items: ${error.message}`);
  }

  return data || [];
}

export async function createMenuItem(
  restaurantId: string,
  input: MenuItemInput
) {
  const adminClient = createAdminClient();

  // Verify category belongs to this restaurant
  const { data: cat } = await adminClient
    .from("menu_categories")
    .select("id")
    .eq("id", input.categoryId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!cat) {
    throw new BadRequestError("Category does not belong to this restaurant");
  }

  const { data, error } = await adminClient
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description || null,
      price_paise: input.pricePaise,
      image_url: input.imageUrl || null,
      is_veg: input.isVeg ?? true,
      is_available: input.isAvailable ?? true,
      tax_rate_percentage: input.taxRatePercentage ?? 5.0,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error || !data) {
    throw new BadRequestError(`Failed to create menu item: ${error?.message}`);
  }

  return data;
}

export async function updateMenuItem(
  restaurantId: string,
  itemId: string,
  input: UpdateMenuItemInput
) {
  const adminClient = createAdminClient();

  if (input.categoryId) {
    const { data: cat } = await adminClient
      .from("menu_categories")
      .select("id")
      .eq("id", input.categoryId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!cat) {
      throw new BadRequestError("Category does not belong to this restaurant");
    }
  }

  const updateData: {
    category_id?: string;
    name?: string;
    description?: string | null;
    price_paise?: number;
    image_url?: string | null;
    is_veg?: boolean;
    is_available?: boolean;
    tax_rate_percentage?: number;
    sort_order?: number;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.pricePaise !== undefined) updateData.price_paise = input.pricePaise;
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
  if (input.isVeg !== undefined) updateData.is_veg = input.isVeg;
  if (input.isAvailable !== undefined) updateData.is_available = input.isAvailable;
  if (input.taxRatePercentage !== undefined) updateData.tax_rate_percentage = input.taxRatePercentage;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

  const { data, error } = await adminClient
    .from("menu_items")
    .update(updateData)
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error || !data) {
    throw new NotFoundError("Menu item not found or update failed");
  }

  return data;
}

export async function deleteMenuItem(
  restaurantId: string,
  itemId: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new BadRequestError(`Failed to delete menu item: ${error.message}`);
  }

  return { success: true };
}

export async function toggleMenuItemAvailability(
  restaurantId: string,
  itemId: string,
  isAvailable: boolean
) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("menu_items")
    .update({
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .select("id, name, is_available")
    .single();

  if (error || !data) {
    throw new NotFoundError("Menu item not found");
  }

  return data;
}

export async function reorderMenuItems(
  restaurantId: string,
  items: { id: string; sortOrder: number }[]
) {
  const adminClient = createAdminClient();

  for (const item of items) {
    await adminClient
      .from("menu_items")
      .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("restaurant_id", restaurantId);
  }

  return { success: true };
}

export async function uploadMenuItemImage(
  restaurantId: string,
  itemId: string | null,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
) {
  const adminClient = createAdminClient();
  const bucketName = "menu-items";

  // Check or ensure storage bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === bucketName);
  if (!exists) {
    await adminClient.storage.createBucket(bucketName, { public: true });
  }

  const filePath = `${restaurantId}/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError || !uploadData) {
    throw new BadRequestError(`Image upload failed: ${uploadError?.message}`);
  }

  const { data: urlData } = adminClient.storage.from(bucketName).getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  if (itemId) {
    // Also record in menu_item_images and update menu_items.image_url
    await adminClient.from("menu_item_images").insert({
      restaurant_id: restaurantId,
      menu_item_id: itemId,
      image_url: publicUrl,
      is_primary: true,
    });

    await adminClient
      .from("menu_items")
      .update({ image_url: publicUrl })
      .eq("id", itemId)
      .eq("restaurant_id", restaurantId);
  }

  return { imageUrl: publicUrl };
}
