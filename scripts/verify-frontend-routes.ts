import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { publicApi } from "@/services/api/public.api";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);

interface RouteCheck {
  name: string;
  url: string;
  expectedStatus: number;
  apiVerifyFn?: () => Promise<boolean>;
}

async function verifyRoutes() {
  console.log("=========================================================");
  console.log("🌐 STARTING FRONTEND ROUTE COMPILATION & INTEGRATION CHECK");
  console.log(`Target: ${baseUrl}`);
  console.log("=========================================================\n");

  // Fetch active QR token
  const { data: qr } = await supabaseAdmin
    .from("table_qr_tokens")
    .select("token, restaurant_id")
    .eq("is_revoked", false)
    .limit(1)
    .single();

  const token = qr?.token || "token_ec4e8629_t01";

  const routes: RouteCheck[] = [
    { name: "Home Landing Page", url: "/", expectedStatus: 200 },
    { name: "Login Portal", url: "/login", expectedStatus: 200 },
    {
      name: "Customer Digital Menu",
      url: `/m/royal-biryani/${token}`,
      expectedStatus: 200,
      apiVerifyFn: async () => {
        const menu = await publicApi.getMenuByTableToken(token);
        return Boolean(menu?.restaurant?.name && menu.categories?.length > 0);
      },
    },
    { name: "Manager Dashboard Overview", url: "/dashboard", expectedStatus: 200 },
    { name: "Live Orders Processing Queue", url: "/dashboard/orders", expectedStatus: 200 },
    { name: "Kitchen Display System (KDS)", url: "/dashboard/kitchen", expectedStatus: 200 },
    { name: "Menu & Categories Manager", url: "/dashboard/menu", expectedStatus: 200 },
    { name: "Tables & QR Codes Manager", url: "/dashboard/tables", expectedStatus: 200 },
    { name: "Sales Reports & Analytics", url: "/dashboard/reports", expectedStatus: 200 },
    { name: "Restaurant Branding & Settings", url: "/dashboard/settings", expectedStatus: 200 },
    { name: "Staff & Permissions", url: "/dashboard/staff", expectedStatus: 200 },
    { name: "Super Admin Platform Console", url: "/admin", expectedStatus: 200 },
  ];

  let passed = 0;
  let failed = 0;

  for (const r of routes) {
    try {
      const res = await fetch(`${baseUrl}${r.url}`);
      const statusMatches = res.status === r.expectedStatus;

      let apiSuccess = true;
      if (r.apiVerifyFn) {
        apiSuccess = await r.apiVerifyFn();
      }

      if (statusMatches && apiSuccess) {
        console.log(`✅ [${res.status}] ${r.name.padEnd(35)} -> ${r.url}`);
        passed++;
      } else {
        console.error(
          `❌ [${res.status}] ${r.name.padEnd(35)} -> Expected ${r.expectedStatus}, apiSuccess: ${apiSuccess}`
        );
        failed++;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ [ERR] ${r.name.padEnd(35)} -> ${msg}`);
      failed++;
    }
  }

  console.log("\n=========================================================");
  console.log(`📊 TOTAL ROUTES: ${routes.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

verifyRoutes();
