"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";
import { getAuthProvider } from "@/lib/auth-provider";

const NAME_PATTERN = /^[A-Za-zÀ-ÿ\s]{1,50}$/;

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const next = String(formData.get("next") || "/profile");
  const fail = (message: string): never => redirect(`${next.includes("?") ? next + "&" : next + "?"}error=${encodeURIComponent(message)}`);

  const rutInput = String(formData.get("rut") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;

  let rut: string | null = null;
  if (rutInput) {
    if (!validateRut(rutInput)) return fail(`El RUT ${rutInput} no es válido.`);
    rut = formatRut(rutInput);
  }

  // Google-managed name arrives as a disabled input, which browsers don't
  // include in FormData at all — so "no full_name in the payload" means
  // "leave it as-is", not "the user submitted an empty name".
  const provider = getAuthProvider(userRes.user);
  const update: { rut: string | null; phone: string | null; full_name?: string } = { rut, phone };
  if (provider === "email") {
    const full_name = String(formData.get("full_name") || "").trim();
    if (!full_name) return fail("El nombre no puede estar vacío.");
    if (!NAME_PATTERN.test(full_name)) return fail("El nombre solo puede tener letras y espacios, máximo 50 caracteres.");
    update.full_name = full_name;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", userRes.user.id);
  if (error) {
    if (error.code === "23505") return fail("Ese RUT ya está registrado por otra cuenta.");
    return fail(error.message);
  }

  revalidatePath("/profile");
  redirect(`${next.includes("?") ? next + "&" : next + "?"}saved=1`);
}
