"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The stored value is the full public URL (per the "only the URL in the
// DB" rule) — to delete the underlying file we need the storage-relative
// path back out of it, which is everything after "/avatars/".
function storagePathFromUrl(url: string): string | null {
  const marker = "/avatars/";
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

async function deleteExistingFile(supabase: Awaited<ReturnType<typeof createClient>>, avatarUrl: string | null) {
  if (!avatarUrl) return;
  const path = storagePathFromUrl(avatarUrl);
  if (path) await supabase.storage.from("avatars").remove([path]);
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const fail = (message: string): never => redirect(`/profile?error=${encodeURIComponent(message)}`);

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("No se seleccionó ninguna imagen.");

  const path = `${userRes.user.id}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: "image/webp" });
  if (uploadError) return fail(`No se pudo subir la foto: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", userRes.user.id).single();
  await deleteExistingFile(supabase, profile?.avatar_url ?? null);

  const { error } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", userRes.user.id);
  if (error) return fail(error.message);

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}

export async function deleteAvatar() {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", userRes.user.id).single();
  await deleteExistingFile(supabase, profile?.avatar_url ?? null);

  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userRes.user.id);
  if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}
