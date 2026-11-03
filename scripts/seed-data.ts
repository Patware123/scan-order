import { createClient } from "@supabase/supabase-js";
import { Database, UserRole, OrderStatus, PaymentStatus } from "@/types/database.types";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function seedDatabase() {
  console.log("🌱 Starting idempotent database seeding...");

  // 1. SEED SUBSCRIPTION PLANS
  console.log("1. Seeding subscription plans...");
  const plans = [
    {
      name: "Starter / Free",
      code: "FREE",
      description: "Ideal for small cafes and quick test setups",
      max_tables: 5,
      price_paise: 0,
      billing_period: "MONTHLY",
      features: ["Up to 5 tables", "Standard digital QR menu", "Kitchen display view"],
      is_active: true,
    },
    {
      name: "Pro Growth",
      code: "PRO",
      description: "Designed for busy restaurants and casual dining",
      max_tables: 25,
      price_paise: 149900, // ₹1,499.00
      billing_period: "MONTHLY",
      features: ["Up to 25 tables", "Custom branding & logo", "Full KDS workflow", "Manager reports"],
      is_active: true,
    },
    {
      name: "Enterprise Unlimited",
      code: "ENTERPRISE",
      description: "For hotel chains, food courts and high-volume dining",
      max_tables: 100,
      price_paise: 399900, // ₹3,999.00
      billing_period: "MONTHLY",
      features: ["Up to 100 tables", "Multi-brand support", "Custom domain", "Advanced analytics"],
      is_active: true,
    },
  ];

  for (const p of plans) {
    const { error } = await supabase.from("subscription_plans").upsert(p, { onConflict: "code" });
    if (error) console.error("Error upserting plan:", p.code, error.message);
  }

  const { data: dbPlans } = await supabase.from("subscription_plans").select("id, code");
  const planMap = new Map(dbPlans?.map((p) => [p.code, p.id]));

  // 2. CREATE / SEED AUTH USERS
  console.log("2. Creating/Verifying test auth users...");
  const testUsers = [
    { email: "superadmin@scanorder.com", password: "Password123!", role: "SUPER_ADMIN" as UserRole },
    { email: "owner.royal@restaurant.com", password: "Password123!", role: "OWNER" as UserRole },
    { email: "manager.royal@restaurant.com", password: "Password123!", role: "MANAGER" as UserRole },
    { email: "chef.royal@restaurant.com", password: "Password123!", role: "KITCHEN" as UserRole },
    { email: "owner.coastal@restaurant.com", password: "Password123!", role: "OWNER" as UserRole },
    { email: "owner.greenleaf@restaurant.com", password: "Password123!", role: "OWNER" as UserRole },
  ];

  const userIds = new Map<string, string>();

  for (const u of testUsers) {
    // Check if user exists in auth.users
    const { data: listData } = await supabase.auth.admin.listUsers();
    let existing = listData?.users.find((eu) => eu.email === u.email);

    if (!existing) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) {
        console.warn(`User creation note for ${u.email}:`, error.message);
      } else if (created.user) {
        existing = created.user;
      }
    }

    if (existing) {
      userIds.set(u.email, existing.id);
    }
  }

  // 3. SEED 3 RESTAURANTS
  console.log("3. Seeding restaurants and branding...");
  const restaurantsData = [
    {
      name: "The Royal Biryani House",
      slug: "royal-biryani",
      currency: "INR",
      gst_number: "36AAAAA0000A1Z5",
      fssai_license: "13622011000123",
      branding: {
        primary_color: "#d97706", // Warm Amber
        tagline: "Authentic Nizami Dum Biryani & Kebabs",
        support_phone: "+91 98765 43210",
        support_email: "orders@royalbiryani.in",
      },
      planCode: "PRO",
      ownerEmail: "owner.royal@restaurant.com",
    },
    {
      name: "Coastal Catch Cafe",
      slug: "coastal-catch",
      currency: "INR",
      gst_number: "29BBBBB1111B2Z6",
      fssai_license: "12922011000456",
      branding: {
        primary_color: "#0284c7", // Ocean Blue
        tagline: "Fresh Coastal Curries & Seafood",
        support_phone: "+91 98765 43211",
        support_email: "hello@coastalcatch.com",
      },
      planCode: "FREE",
      ownerEmail: "owner.coastal@restaurant.com",
    },
    {
      name: "Green Leaf Pure Veg Bistro",
      slug: "green-leaf",
      currency: "INR",
      gst_number: "24CCCCC2222C3Z7",
      fssai_license: "12422011000789",
      branding: {
        primary_color: "#059669", // Emerald Green
        tagline: "100% Pure Vegetarian Gourmet & Thalis",
        support_phone: "+91 98765 43212",
        support_email: "support@greenleafbistro.com",
      },
      planCode: "ENTERPRISE",
      ownerEmail: "owner.greenleaf@restaurant.com",
    },
  ];

  const restaurantIds = new Map<string, string>();

  for (const r of restaurantsData) {
    let { data: rest } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", r.slug)
      .maybeSingle();

    if (!rest) {
      const { data: created, error } = await supabase
        .from("restaurants")
        .insert({
          name: r.name,
          slug: r.slug,
          currency: r.currency,
          gst_number: r.gst_number,
          fssai_license: r.fssai_license,
          is_active: true,
        })
        .select("id")
        .single();

      if (error || !created) {
        console.error("Failed to insert restaurant:", r.name, error?.message);
        continue;
      }
      rest = created;
    }

    restaurantIds.set(r.slug, rest.id);

    // Upsert Branding
    await supabase.from("restaurant_branding").upsert({
      restaurant_id: rest.id,
      primary_color: r.branding.primary_color,
      tagline: r.branding.tagline,
      support_phone: r.branding.support_phone,
      support_email: r.branding.support_email,
    });

    // Upsert Subscription
    const planId = planMap.get(r.planCode);
    if (planId) {
      await supabase.from("restaurant_subscriptions").upsert({
        restaurant_id: rest.id,
        plan_id: planId,
        status: "ACTIVE",
      }, { onConflict: "restaurant_id" });
    }

    // Attach Owner
    const ownerId = userIds.get(r.ownerEmail);
    if (ownerId) {
      await supabase.from("restaurant_users").upsert({
        restaurant_id: rest.id,
        user_id: ownerId,
        role: "OWNER",
        is_active: true,
      }, { onConflict: "restaurant_id,user_id" });
    }
  }

  // 4. ATTACH MANAGER & KITCHEN STAFF TO ROYAL BIRYANI
  const royalId = restaurantIds.get("royal-biryani");
  if (royalId) {
    const managerId = userIds.get("manager.royal@restaurant.com");
    if (managerId) {
      await supabase.from("restaurant_users").upsert({
        restaurant_id: royalId,
        user_id: managerId,
        role: "MANAGER",
        is_active: true,
      }, { onConflict: "restaurant_id,user_id" });
    }

    const chefId = userIds.get("chef.royal@restaurant.com");
    if (chefId) {
      await supabase.from("restaurant_users").upsert({
        restaurant_id: royalId,
        user_id: chefId,
        role: "KITCHEN",
        is_active: true,
      }, { onConflict: "restaurant_id,user_id" });
    }
  }

  // Attach Super Admin role record
  const superAdminId = userIds.get("superadmin@scanorder.com");
  if (superAdminId && royalId) {
    await supabase.from("restaurant_users").upsert({
      restaurant_id: royalId,
      user_id: superAdminId,
      role: "SUPER_ADMIN",
      is_active: true,
    }, { onConflict: "restaurant_id,user_id" });
  }

  // 5. SEED TABLES AND QR TOKENS FOR ROYAL BIRYANI
  console.log("4. Seeding tables and active QR tokens...");
  const tableTokens: { tableNumber: string; token: string; tableId: string }[] = [];

  if (royalId) {
    const tables = [
      { table_number: "T-01", capacity: 2 },
      { table_number: "T-02", capacity: 4 },
      { table_number: "T-03", capacity: 4 },
      { table_number: "T-04", capacity: 6 },
      { table_number: "T-05", capacity: 8 },
    ];

    for (const t of tables) {
      let { data: tableRecord } = await supabase
        .from("restaurant_tables")
        .select("id")
        .eq("restaurant_id", royalId)
        .eq("table_number", t.table_number)
        .maybeSingle();

      if (!tableRecord) {
        const { data: created } = await supabase
          .from("restaurant_tables")
          .insert({
            restaurant_id: royalId,
            table_number: t.table_number,
            capacity: t.capacity,
            is_active: true,
          })
          .select("id")
          .single();
        tableRecord = created;
      }

      if (tableRecord) {
        const fixedToken = `token_${r_slug_hash("royal")}_${t.table_number.toLowerCase().replace("-", "")}`;
        await supabase.from("table_qr_tokens").upsert({
          restaurant_id: royalId,
          table_id: tableRecord.id,
          token: fixedToken,
          is_revoked: false,
        }, { onConflict: "token" });

        tableTokens.push({
          tableNumber: t.table_number,
          token: fixedToken,
          tableId: tableRecord.id,
        });
      }
    }
  }

  // 6. SEED MENU CATEGORIES & ITEMS
  console.log("5. Seeding categories and menu items with integer paise prices...");
  const seededMenuItems: { id: string; name: string; price_paise: number }[] = [];

  if (royalId) {
    const categoriesData = [
      {
        name: "Starters & Appetizers",
        sort_order: 1,
        items: [
          { name: "Murgh Malai Tikka", price_paise: 34000, is_veg: false, desc: "Tender chicken steeped in cream and cardamom" },
          { name: "Paneer Hariyali Tikka", price_paise: 29000, is_veg: true, desc: "Charcoal roasted cottage cheese marinated in mint" },
          { name: "Galouti Kebab", price_paise: 38000, is_veg: false, desc: "Mouth-melting minced lamb infused with 32 spices" },
        ],
      },
      {
        name: "Nizami Dum Biryani",
        sort_order: 2,
        items: [
          { name: "Hyderabadi Chicken Dum Biryani", price_paise: 39000, is_veg: false, desc: "Aromatic basmati rice cooked on slow dum with chicken" },
          { name: "Royal Mutton Biryani", price_paise: 52000, is_veg: false, desc: "Tender goat meat infused with saffron and aged basmati" },
          { name: "Subz Dum Biryani", price_paise: 28000, is_veg: true, desc: "Seasonal garden vegetables, saffron and crispy fried onions" },
        ],
      },
      {
        name: "Breads & Curries",
        sort_order: 3,
        items: [
          { name: "Butter Chicken", price_paise: 42000, is_veg: false, desc: "Tandoori chicken pulled and simmered in velvety makhani gravy" },
          { name: "Dal Makhani", price_paise: 26000, is_veg: true, desc: "Slow-cooked black lentils simmered overnight with cream" },
          { name: "Butter Garlic Naan", price_paise: 7500, is_veg: true, desc: "Crisp tandoor flatbread brushed with garlic butter" },
        ],
      },
      {
        name: "Beverages & Desserts",
        sort_order: 4,
        items: [
          { name: "Royal Mango Lassi", price_paise: 12000, is_veg: true, desc: "Alphonso mango pulp whipped with thick chilled yoghurt" },
          { name: "Shahi Tukda", price_paise: 16000, is_veg: true, desc: "Crispy bread soaked in saffron sugar syrup topped with rabri" },
        ],
      },
    ];

    for (const cat of categoriesData) {
      let { data: catRecord } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", royalId)
        .eq("name", cat.name)
        .maybeSingle();

      if (!catRecord) {
        const { data: created } = await supabase
          .from("menu_categories")
          .insert({
            restaurant_id: royalId,
            name: cat.name,
            sort_order: cat.sort_order,
            is_active: true,
          })
          .select("id")
          .single();
        catRecord = created;
      }

      if (catRecord) {
        for (const itm of cat.items) {
          let { data: itemRecord } = await supabase
            .from("menu_items")
            .select("id, name, price_paise")
            .eq("restaurant_id", royalId)
            .eq("name", itm.name)
            .maybeSingle();

          if (!itemRecord) {
            const { data: createdItem } = await supabase
              .from("menu_items")
              .insert({
                restaurant_id: royalId,
                category_id: catRecord.id,
                name: itm.name,
                description: itm.desc,
                price_paise: itm.price_paise,
                is_veg: itm.is_veg,
                is_available: true,
                tax_rate_percentage: 5.0,
              })
              .select("id, name, price_paise")
              .single();
            itemRecord = createdItem;
          }

          if (itemRecord) {
            seededMenuItems.push(itemRecord);
          }
        }
      }
    }
  }

  // 7. SEED ORDERS IN DIFFERENT LIFECYCLE STATES
  console.log("6. Seeding realistic orders across lifecycle states...");
  if (royalId && tableTokens.length >= 5 && seededMenuItems.length >= 3) {
    const statuses: { status: OrderStatus; payment: PaymentStatus; tableIdx: number }[] = [
      { status: "PENDING", payment: "UNPAID", tableIdx: 0 },
      { status: "ACCEPTED", payment: "UNPAID", tableIdx: 1 },
      { status: "PREPARING", payment: "UNPAID", tableIdx: 2 },
      { status: "READY", payment: "UNPAID", tableIdx: 3 },
      { status: "COMPLETED", payment: "PAID", tableIdx: 4 },
    ];

    for (let i = 0; i < statuses.length; i++) {
      const st = statuses[i];
      const table = tableTokens[st.tableIdx];
      const orderNumber = `ORD-20261103-${(i + 1).toString().padStart(4, "0")}`;
      const trackingToken = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();

      const item1 = seededMenuItems[0];
      const item2 = seededMenuItems[1];
      const line1 = item1.price_paise * 2;
      const line2 = item2.price_paise * 1;
      const subtotal = line1 + line2;
      const tax = Math.round(subtotal * 0.05);
      const total = subtotal + tax;

      const { data: orderRecord } = await supabase
        .from("orders")
        .upsert({
          restaurant_id: royalId,
          table_id: table.tableId,
          order_number: orderNumber,
          order_status: st.status,
          payment_status: st.payment,
          subtotal_paise: subtotal,
          tax_paise: tax,
          total_paise: total,
          guest_tracking_token: trackingToken,
          special_instructions: i === 2 ? "Please make it spicy and crispy" : null,
        }, { onConflict: "guest_tracking_token" })
        .select("id")
        .maybeSingle();

      if (orderRecord) {
        // Insert order items
        await supabase.from("order_items").upsert([
          {
            order_id: orderRecord.id,
            menu_item_id: item1.id,
            item_name_snapshot: item1.name,
            unit_price_paise: item1.price_paise,
            quantity: 2,
            line_total_paise: line1,
          },
          {
            order_id: orderRecord.id,
            menu_item_id: item2.id,
            item_name_snapshot: item2.name,
            unit_price_paise: item2.price_paise,
            quantity: 1,
            line_total_paise: line2,
          },
        ]);

        // Insert status events
        await supabase.from("order_status_events").insert({
          order_id: orderRecord.id,
          previous_status: null,
          new_status: st.status,
          actor_type: "CUSTOMER",
          note: `Seed order set to ${st.status}`,
        });

        // Insert idempotency record
        await supabase.from("order_idempotency_keys").upsert({
          restaurant_id: royalId,
          idempotency_key: idempotencyKey,
          order_id: orderRecord.id,
          request_hash: "seed_hash_" + i,
        }, { onConflict: "restaurant_id,idempotency_key" });
      }
    }
  }

  console.log("✅ Database seeding completed successfully!");
  console.log("\n--- TEST CREDENTIALS & SAMPLES ---");
  console.log("Super Admin:", "superadmin@scanorder.com / Password123!");
  console.log("Royal Biryani Owner:", "owner.royal@restaurant.com / Password123!");
  console.log("Royal Biryani Manager:", "manager.royal@restaurant.com / Password123!");
  console.log("Royal Biryani Kitchen:", "chef.royal@restaurant.com / Password123!");
  console.log("Primary Test QR Token:", tableTokens[0]?.token || "N/A");
  console.log("Primary Restaurant ID:", royalId);
  console.log("---------------------------------\n");
}

function r_slug_hash(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex").slice(0, 8);
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}
