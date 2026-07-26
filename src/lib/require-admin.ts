import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Every /admin/* page needs this same check — previously each page that
// cared about is_platform_admin (Perfil, disputes, catalog) just
// conditionally hid a section, never actually gated a whole route. This is
// the first route that has to.
export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_platform_admin").eq("id", userRes.user.id).single();
  if (!profile?.is_platform_admin) redirect("/");

  return { supabase, user: userRes.user };
}
