"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadApplicantDocument(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const document_type = String(formData.get("document_type"));
  const file = formData.get("file");

  const fail = (message: string): never => redirect(`/documents?error=${encodeURIComponent(message)}`);
  if (!(file instanceof File) || file.size === 0) return fail("Selecciona un archivo.");
  if (!document_type) return fail("Selecciona el tipo de documento.");

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${userRes.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("applicant-documents").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) return fail(`No se pudo subir el archivo: ${uploadError.message}`);

  const { error } = await supabase
    .from("applicant_documents")
    .insert({ user_id: userRes.user.id, document_type, storage_path: path });
  if (error) return fail(error.message);

  revalidatePath("/documents");
  redirect("/documents");
}

export async function deleteApplicantDocument(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const storage_path = String(formData.get("storage_path"));

  await supabase.storage.from("applicant-documents").remove([storage_path]);
  const { error } = await supabase.from("applicant_documents").delete().eq("id", id);
  if (error) redirect(`/documents?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/documents");
  redirect("/documents");
}
