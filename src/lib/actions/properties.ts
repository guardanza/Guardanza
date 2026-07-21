"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

async function uploadPhotoIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData
): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("property-photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

  const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function createProperty(formData: FormData) {
  const supabase = await createClient();

  const organization_id = String(formData.get("organization_id"));
  const address = String(formData.get("address"));
  const commune_id = String(formData.get("commune_id") || "") || null;
  const broker_org_code = String(formData.get("broker_org_code") || "").trim() || null;

  const fail = (message: string): never =>
    redirect(`/properties/new?organization_id=${organization_id}&error=${encodeURIComponent(message)}`);

  let broker_organization_id: string | null = null;
  if (broker_org_code) {
    const { data: broker, error: lookupError } = await supabase
      .rpc("lookup_organization_by_code", { p_code: broker_org_code })
      .maybeSingle<{ id: string; name: string; type: string }>();
    if (lookupError) return fail(lookupError.message);
    if (!broker) return fail(`No existe ninguna corredora con el código ${broker_org_code}.`);
    broker_organization_id = broker.id;
  }

  let photo_url: string | null = null;
  try {
    photo_url = await uploadPhotoIfPresent(supabase, formData);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo subir la foto.");
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({ organization_id, address, commune_id, broker_organization_id, photo_url })
    .select("id")
    .single();

  if (error) return fail(error.message);

  redirect(`/properties/${property.id}`);
}

export async function updateProperty(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const address = String(formData.get("address"));
  const commune_id = String(formData.get("commune_id") || "") || null;
  const organization_id = String(formData.get("organization_id") || "") || null;
  const broker_org_code = String(formData.get("broker_org_code") || "").trim() || null;

  const fail = (message: string): never =>
    redirect(`/properties/${id}/edit?error=${encodeURIComponent(message)}`);

  // Only touch broker_organization_id when a code was actually submitted —
  // the edit form leaves this field blank when there's nothing to change,
  // and blank must mean "leave as-is", not "unlink the broker".
  let broker_organization_id: string | undefined;
  if (broker_org_code) {
    const { data: broker, error: lookupError } = await supabase
      .rpc("lookup_organization_by_code", { p_code: broker_org_code })
      .maybeSingle<{ id: string; name: string; type: string }>();
    if (lookupError) return fail(lookupError.message);
    if (!broker) return fail(`No existe ninguna corredora con el código ${broker_org_code}.`);
    broker_organization_id = broker.id;
  }

  let photo_url: string | undefined;
  try {
    const uploaded = await uploadPhotoIfPresent(supabase, formData);
    if (uploaded) photo_url = uploaded;
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo subir la foto.");
  }

  const { error } = await supabase
    .from("properties")
    .update({
      address,
      commune_id,
      ...(organization_id ? { organization_id } : {}),
      ...(broker_organization_id ? { broker_organization_id } : {}),
      ...(photo_url ? { photo_url } : {}),
    })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}

export async function addPropertyTenant(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id"));
  const email = String(formData.get("tenant_email") || "").trim();

  const fail = (message: string): never =>
    redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(message)}`);
  if (!email) return fail("Ingresa un email.");

  const admin = createServiceRoleClient();
  const { data: usersPage, error: lookupError } = await admin.auth.admin.listUsers();
  if (lookupError) return fail(lookupError.message);
  const tenant = usersPage.users.find((u) => u.email === email);
  if (!tenant) return fail(`No existe una cuenta con el email ${email}. Debe registrarse primero.`);

  const { error } = await supabase.from("property_tenants").insert({ property_id, user_id: tenant.id });
  if (error) return fail(error.message);

  revalidatePath(`/properties/${property_id}/edit`);
  redirect(`/properties/${property_id}/edit`);
}

export async function removePropertyTenant(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const property_id = String(formData.get("property_id"));

  const { error } = await supabase.from("property_tenants").delete().eq("id", id);
  if (error) redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/properties/${property_id}/edit`);
  redirect(`/properties/${property_id}/edit`);
}

export async function deleteProperty(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) {
    redirect(`/properties/${id}?error=${encodeURIComponent("No se puede eliminar: tiene contratos asociados.")}`);
  }

  revalidatePath("/properties");
  redirect("/properties");
}
