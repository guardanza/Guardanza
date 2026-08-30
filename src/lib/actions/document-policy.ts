"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INCOME_TYPES, DEFAULT_REQUIRED_DOCUMENTS } from "@/lib/candidate-documents";

// Un checkbox por (tipo de ingreso, tipo de documento) — checked = lo
// exijo. Se guarda el conjunto COMPLETO de filas que la spec define
// como base para cada tipo de ingreso, no solo las que difieren del
// default: más simple y predecible que un delta disperso (la fila
// existe siempre que la persona haya guardado esta pantalla una vez;
// "sin fila" sigue significando "nunca tocó esto", no "todo en false").
function buildPolicyRows(formData: FormData) {
  return INCOME_TYPES.flatMap((incomeType) =>
    DEFAULT_REQUIRED_DOCUMENTS[incomeType].map((documentType) => ({
      income_type: incomeType,
      document_type: documentType,
      required: formData.get(`doc_${incomeType}_${documentType}`) === "on",
    }))
  );
}

// Política general (Etapa 1, capa 1) — vive en /profile, una por
// organización, aplica a todas sus propiedades salvo que una tenga su
// propio ajuste (capa 2, más abajo).
export async function updateOrgDocumentPolicy(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const organization_id = String(formData.get("organization_id") || "");
  if (!organization_id) redirect("/profile?error=" + encodeURIComponent("No se encontró tu organización."));

  const rows = buildPolicyRows(formData).map((r) => ({ ...r, organization_id }));

  const { error } = await supabase
    .from("org_document_policy")
    .upsert(rows, { onConflict: "organization_id,income_type,document_type" });
  if (error) redirect(`/profile?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/profile");
  redirect("/profile?success=document_policy");
}

// Ajuste por propiedad (Etapa 1, capa 2) — opcional, "para arriendo
// alto". Guarda el conjunto completo igual que la política general;
// removePropertyDocumentPolicy (abajo) es la única forma de volver a
// "usa la política general", no un estado que se alcance vaciando
// checkboxes (todo en false ES una política válida: "no exijo nada").
export async function updatePropertyDocumentPolicy(formData: FormData) {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const property_id = String(formData.get("property_id") || "");
  if (!property_id) redirect("/properties?error=" + encodeURIComponent("No se encontró la propiedad."));

  const rows = buildPolicyRows(formData).map((r) => ({ ...r, property_id }));

  const { error } = await supabase
    .from("property_document_policy")
    .upsert(rows, { onConflict: "property_id,income_type,document_type" });
  if (error) redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/properties/${property_id}/edit`);
  redirect(`/properties/${property_id}/edit?success=document_policy`);
}

export async function removePropertyDocumentPolicy(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id") || "");

  const { error } = await supabase.from("property_document_policy").delete().eq("property_id", property_id);
  if (error) redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/properties/${property_id}/edit`);
  redirect(`/properties/${property_id}/edit?success=document_policy_removed`);
}
