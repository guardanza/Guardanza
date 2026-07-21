"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateRut, formatRut } from "@/lib/rut";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const full_name = String(formData.get("full_name") || "").trim();
  const rutInput = String(formData.get("rut") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;

  const fail = (message: string): never => redirect(`/profile?error=${encodeURIComponent(message)}`);
  if (!full_name) return fail("El nombre no puede estar vacío.");

  let rut: string | null = null;
  if (rutInput) {
    if (!validateRut(rutInput)) return fail(`El RUT ${rutInput} no es válido.`);
    rut = formatRut(rutInput);
  }

  const { error } = await supabase.from("profiles").update({ full_name, rut, phone }).eq("id", userRes.user.id);
  if (error) {
    if (error.code === "23505") return fail("Ese RUT ya está registrado por otra cuenta.");
    return fail(error.message);
  }

  revalidatePath("/profile");
  redirect("/profile");
}
