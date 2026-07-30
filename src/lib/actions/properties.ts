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

// Reduced to the minimum properties needs to exist at all — dirección,
// comuna, and the first owning org (organization_id stays not null, so
// there's always at least one owner from the start; guardado incremental
// means everything else — foto, código de corredora, expected_* fields,
// copropietarios adicionales — gets filled in afterwards on /edit, never
// lost, never blocking the initial save).
export async function createProperty(formData: FormData) {
  const supabase = await createClient();

  const organization_id = String(formData.get("organization_id"));
  const address = String(formData.get("address"));
  const commune_id = String(formData.get("commune_id") || "") || null;

  const fail = (message: string): never =>
    redirect(`/properties/new?organization_id=${organization_id}&error=${encodeURIComponent(message)}`);

  const { data: property, error } = await supabase
    .from("properties")
    .insert({ organization_id, address, commune_id })
    .select("id")
    .single();
  if (error) return fail(error.message);

  // The creating org is the first row in property_landlords — same
  // invariant the Paso 1 backfill established for every pre-existing
  // property (always at least one landlord row matching organization_id).
  const { error: landlordError } = await supabase
    .from("property_landlords")
    .insert({ property_id: property.id, organization_id });
  if (landlordError) return fail(landlordError.message);

  redirect(`/properties/${property.id}/edit`);
}

// Parses an optional numeric form field: "" (never touched, or cleared by
// the user) means null, not 0 — Number("") is 0, which would silently turn
// "leave this empty" into "set the rent to zero".
function parseOptionalNumber(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) || "").trim();
  return raw === "" ? null : Number(raw);
}

function parseOptionalCurrency(formData: FormData, key: string): string | null {
  return String(formData.get(key) || "").trim() || null;
}

// Accepts "portalinmobiliario.cl" same as "https://portalinmobiliario.cl"
// — most people typing a listing link don't think to include the scheme.
// Prepends https:// when missing, then validates the result is a real URL
// (catches "not a domain at all", not just "missing the protocol").
function normalizeListingUrl(raw: string): string | null {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  new URL(withScheme); // throws if still not a valid URL — let the caller catch it
  return withScheme;
}

export async function updateProperty(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));
  const address = String(formData.get("address"));
  const commune_id = String(formData.get("commune_id") || "") || null;
  const organization_id = String(formData.get("organization_id") || "") || null;
  const broker_org_code = String(formData.get("broker_org_code") || "").trim() || null;
  const listing_url_raw = String(formData.get("listing_url") || "").trim() || null;

  const fail = (message: string): never =>
    redirect(`/properties/${id}/edit?error=${encodeURIComponent(message)}`);

  // Unlike broker_org_code/photo below (blank = leave as-is), listing_url
  // and the expected_* fields are regular value fields pre-filled from the
  // current row — blank here means the user actually cleared it.
  let listing_url: string | null = null;
  if (listing_url_raw) {
    try {
      listing_url = normalizeListingUrl(listing_url_raw);
    } catch {
      return fail("El link externo no es válido — revisá que el dominio esté bien escrito.");
    }
  }

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
      listing_url,
      expected_rent_amount: parseOptionalNumber(formData, "expected_rent_amount"),
      expected_rent_currency: parseOptionalCurrency(formData, "expected_rent_currency"),
      expected_term_months: parseOptionalNumber(formData, "expected_term_months"),
      expected_guarantee_amount: parseOptionalNumber(formData, "expected_guarantee_amount"),
      expected_guarantee_currency: parseOptionalCurrency(formData, "expected_guarantee_currency"),
    })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}

// Copropietarios: mismo patrón simple que addPropertyTenant/
// removePropertyTenant (select entre tus propias membresías admin, no el
// buscador por nombre/email/RUT — eso es la próxima tanda). Solo el admin
// de la org dueña original puede llamar estas acciones (RLS de
// property_landlords, 20260731100001) — los copropietarios agregados no
// ganan, por estar en la lista, la capacidad de gestionarla ellos mismos.
export async function addPropertyLandlord(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id"));
  const organization_id = String(formData.get("organization_id") || "");

  const fail = (message: string): never =>
    redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(message)}`);
  if (!organization_id) return fail("Selecciona una organización.");

  const { error } = await supabase.from("property_landlords").insert({ property_id, organization_id });
  if (error) {
    if (error.code === "23505") return fail("Esa organización ya es copropietaria de esta propiedad.");
    return fail(error.message);
  }

  revalidatePath(`/properties/${property_id}/edit`);
  redirect(`/properties/${property_id}/edit`);
}

export async function removePropertyLandlord(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const property_id = String(formData.get("property_id"));

  const { error } = await supabase.from("property_landlords").delete().eq("id", id);
  if (error) redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/properties/${property_id}/edit`);
  redirect(`/properties/${property_id}/edit`);
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
