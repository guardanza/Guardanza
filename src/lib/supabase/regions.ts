import { createClient } from "@/lib/supabase/server";

export async function getRegionsWithCommunes(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, communes(id, name)")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data.map((r) => ({ ...r, communes: [...r.communes].sort((a, b) => a.name.localeCompare(b.name, "es")) }));
}
