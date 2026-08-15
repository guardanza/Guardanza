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

// Pantalla A del Paso 1 del wizard: lo mínimo para que la propiedad
// exista — dirección, comuna, y la organización que administra la ficha
// (organization_id, siempre la del corredor que la crea, nunca elegible
// acá — "Arrendador" real se resuelve aparte, en property_landlords, vía
// el buscador de /edit). Nace en status='borrador' (default de columna)
// — recién pasa a 'activa' al completar el Paso 2 (ver updateProperty).
export async function createProperty(formData: FormData) {
  const supabase = await createClient();

  const organization_id = String(formData.get("organization_id"));
  const address = String(formData.get("address"));
  const commune_id = String(formData.get("commune_id") || "") || null;

  const fail = (message: string): never =>
    redirect(`/properties/new?error=${encodeURIComponent(message)}`);

  const { data: property, error } = await supabase
    .from("properties")
    .insert({ organization_id, address, commune_id })
    .select("id")
    .single();
  if (error) return fail(error.message);

  // La organización creadora entra como la primera fila de
  // property_landlords (mismo backfill 1:1 de siempre) — pero como es
  // type='broker' (la del corredor), el filtro por type='individual' que
  // usa el wizard para decidir si ya hay arrendador real la ignora. El
  // Paso 1 sigue pidiendo un arrendador de verdad hasta que se agregue
  // uno vía el buscador.
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

// organization_id ya no viaja del cliente — el selector que lo exponía
// como si fuera "Arrendador" mostraba las propias corredoras del usuario
// (bug: sacado por completo, ver diagnóstico del wizard). Quién
// administra la ficha se fija una sola vez, al crearla, y no se vuelve a
// tocar acá.
//
// activate=1 (solo lo manda el botón "Guardar cambios" del Paso 2 del
// wizard) es la única puerta que pasa la propiedad de 'borrador' a
// 'activa' — cualquier otro guardado (correcciones del Paso 1, o edición
// posterior ya con la propiedad activa) deja el estado como está.
//
// Pero activate=1 no alcanza solo: valor de arriendo, plazo y garantía
// son obligatorios para ACTIVAR (no para crear — el Paso 1 ya guardó la
// propiedad como borrador con solo dirección/comuna/arrendador). Si
// falta alguno, se guarda igual lo que sí vino, pero el estado se queda
// en 'borrador' — PropertyDetailsForm ya bloquea este caso antes de
// llegar acá con un bottom sheet, esto es la defensa server-side (nunca
// confiar en que el cliente ya filtró bien).
export async function updateProperty(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));
  // El Paso 2 del wizard (Foto y valores) no incluye dirección/comuna en
  // su formulario — a diferencia del Paso 1 y de la edición de una
  // propiedad ya activa, que sí las traen. formData.has() distingue "no
  // se mandó este campo" (Paso 2) de "se mandó vacío" (no debería pasar,
  // el campo es required, pero si pasara sería un vaciado real). Sin este
  // chequeo, confirmar el Paso 2 pisaba la dirección ya guardada con la
  // string "null" y la comuna con NULL.
  const hasAddressFields = formData.has("address");
  const address = hasAddressFields ? String(formData.get("address")) : undefined;
  const commune_id = hasAddressFields ? String(formData.get("commune_id") || "") || null : undefined;
  const listing_url_raw = String(formData.get("listing_url") || "").trim() || null;
  const activate = formData.get("activate") === "1";
  const expected_rent_amount = parseOptionalNumber(formData, "expected_rent_amount");
  const expected_term_months = parseOptionalNumber(formData, "expected_term_months");
  const expected_guarantee_amount = parseOptionalNumber(formData, "expected_guarantee_amount");
  const canActivate = expected_rent_amount !== null && expected_term_months !== null && expected_guarantee_amount !== null;

  const fail = (message: string): never =>
    redirect(`/properties/${id}/edit?error=${encodeURIComponent(message)}`);

  // Unlike photo_url below (blank = leave as-is), listing_url and the
  // expected_* fields are regular value fields pre-filled from the
  // current row — blank here means the user actually cleared it.
  let listing_url: string | null = null;
  if (listing_url_raw) {
    try {
      listing_url = normalizeListingUrl(listing_url_raw);
    } catch {
      return fail("El link externo no es válido — revisa que el dominio esté bien escrito.");
    }
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
      ...(hasAddressFields ? { address, commune_id } : {}),
      ...(photo_url ? { photo_url } : {}),
      listing_url,
      expected_rent_amount,
      expected_rent_currency: parseOptionalCurrency(formData, "expected_rent_currency"),
      expected_term_months,
      expected_guarantee_amount,
      expected_guarantee_currency: parseOptionalCurrency(formData, "expected_guarantee_currency"),
      ...(activate && canActivate ? { status: "activa" as const } : {}),
    })
    .eq("id", id);
  if (error) return fail(error.message);

  if (activate && !canActivate) {
    const missing = [
      expected_rent_amount === null && "valor de arriendo",
      expected_term_months === null && "plazo de arriendo",
      expected_guarantee_amount === null && "valor garantía",
    ]
      .filter((v): v is string => !!v)
      .join(", ");
    return fail(`Faltan datos para activar la propiedad: ${missing}.`);
  }

  if (activate) {
    revalidatePath(`/properties/${id}`);
    redirect(`/properties/${id}`);
  }
  revalidatePath(`/properties/${id}/edit`);
  redirect(`/properties/${id}/edit`);
}

// Arrendadores adicionales: recibe un organization_id ya resuelto por
// LandlordSearchField (resuelve un contacto de la libreta a su
// organización vía resolve_contact_organization, Paso 6.7). Solo el
// admin de la org dueña original puede llamarla (RLS de
// property_landlords, 20260731100001) — los arrendadores agregados no
// ganan, por estar en la lista, la capacidad de gestionarla ellos
// mismos. Se envía sola al elegir un resultado del buscador (Sección 2
// del formulario) — sin botón "Agregar" aparte.
export async function addPropertyLandlord(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id"));
  const organization_id = String(formData.get("organization_id") || "");

  const fail = (message: string): never =>
    redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(message)}`);
  if (!organization_id) return fail("Selecciona una organización o busca a la persona por nombre.");

  const { error } = await supabase.from("property_landlords").insert({ property_id, organization_id });
  if (error) {
    if (error.code === "23505") return fail("Esa persona ya es arrendadora de esta propiedad.");
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

// Corredor asociado: acción propia (Sección 3 del formulario), separada
// de updateProperty, para que elegir un resultado del buscador
// (BrokerSearchField, Paso 6.5) lo persista de inmediato sin depender de
// que se haya guardado el resto de la Sección 1. El modelo hoy solo
// admite un corredor por propiedad — broker_organization_id es una
// columna escalar en properties, no una tabla puente — así que esta
// acción reemplaza al que hubiera, nunca agrega uno segundo.
export async function setPropertyBroker(formData: FormData) {
  const supabase = await createClient();
  const property_id = String(formData.get("property_id"));
  const broker_org_search_id = String(formData.get("broker_organization_id") || "").trim();

  const fail = (message: string): never =>
    redirect(`/properties/${property_id}/edit?error=${encodeURIComponent(message)}`);
  if (!broker_org_search_id) return fail("Busca una corredora por nombre o RUT.");

  // El id viene de un campo oculto que el cliente controla — se valida
  // server-side que sea de verdad una organización type='broker' antes
  // de confiar en él. RLS normal no alcanza acá (todavía no compartes
  // ninguna propiedad con esa corredora, es precisamente lo que se está
  // por crear), así que se valida con el cliente de service-role, sin
  // exponer nada más que ese chequeo booleano.
  const admin = createServiceRoleClient();
  const { data: broker, error: lookupError } = await admin
    .from("organizations")
    .select("id")
    .eq("id", broker_org_search_id)
    .eq("type", "broker")
    .maybeSingle();
  if (lookupError) return fail(lookupError.message);
  if (!broker) return fail("La corredora seleccionada ya no es válida — prueba buscarla de nuevo.");

  const { error } = await supabase.from("properties").update({ broker_organization_id: broker.id }).eq("id", property_id);
  if (error) return fail(error.message);

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

// Marcar/reactivar fuera de cartera: la validación real (¿tiene un
// contrato en proceso o una garantía en custodia?) vive adentro de
// set_property_inactive() — atómica, con lock de fila, mismo patrón que
// pay_guarantee()/sign_contract_tenant(). La UI ya decide de antemano qué
// mensaje mostrar (PropertyLifecycleAction calcula lo mismo server-side
// para elegir el bottom sheet correcto), pero esta acción es la que de
// verdad manda — nunca confía en que el cliente ya filtró bien.
export async function deactivateProperty(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.rpc("set_property_inactive", { p_property_id: id });
  if (error) {
    const message = error.message.includes("guarantee_in_custody")
      ? "Esta propiedad tiene una garantía en custodia. No puedes sacarla de cartera hasta cerrar el contrato."
      : error.message.includes("contract_in_progress")
        ? "Esta propiedad tiene un contrato en proceso. Debes cancelarlo antes de sacarla de cartera."
        : "No se pudo marcar la propiedad fuera de cartera.";
    redirect(`/properties/${id}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}

export async function reactivateProperty(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  const { error } = await supabase.rpc("set_property_active", { p_property_id: id });
  if (error) {
    redirect(`/properties/${id}?error=${encodeURIComponent("No se pudo reactivar la propiedad.")}`);
  }

  revalidatePath(`/properties/${id}`);
  redirect(`/properties/${id}`);
}
