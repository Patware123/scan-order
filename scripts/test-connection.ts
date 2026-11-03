import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("Testing connection to:", supabaseUrl);

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from("_test_table").select("*").limit(1);
  console.log("Supabase response:", { data, error });
}

main().catch(console.error);
