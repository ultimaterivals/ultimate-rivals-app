import type { SupabaseClient } from "@supabase/supabase-js";

export async function listCommercialAdmin(client: SupabaseClient) {
  const [products, rules, packages, charges] = await Promise.all([
    client.from("products").select("*").order("product_type"),
    client
      .from("pricing_rules")
      .select("*,products(name,code)")
      .order("starts_at", { ascending: false }),
    client.from("packages").select("*,products(name,code)").order("name"),
    client
      .from("admin_payment_operations")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  for (const response of [products, rules, packages, charges]) {
    if (response.error) throw response.error;
  }
  return {
    products: products.data ?? [],
    rules: rules.data ?? [],
    packages: packages.data ?? [],
    charges: charges.data ?? [],
  };
}

export async function listAthleteBilling(
  client: SupabaseClient,
  athleteId: string,
) {
  const { data, error } = await client
    .from("athlete_billing_items")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
