import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import { deleteProperty, deactivateProperty, reactivateProperty } from "@/lib/actions/properties";
import { addPropertyCandidate, markCandidateNotSelected, reactivateCandidate, inviteCandidateByEmail } from "@/lib/actions/candidates";
import { startCandidateEvaluation } from "@/lib/actions/candidate-participants";
import { stripParticularSuffix } from "@/lib/labels";
import { formatMoney, type MoneyCurrency } from "@/lib/money";
import { cn } from "@/lib/utils";
import { policyRowsToMap, type CandidateDocumentType, type CandidateIdentityDocType, type CandidateIncomeType } from "@/lib/candidate-documents";
import { resolveCandidateProgress } from "@/lib/candidate-document-list";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { PropertyThumb } from "@/components/property-thumb";
import { CandidateSearchField } from "@/components/candidate-search-field";
import { NewContractButton } from "@/components/new-contract-button";
import { ScrollIntoViewOnMount } from "@/components/scroll-into-view-on-mount";
import { CandidateCard } from "@/components/candidate-card";
import { ListingPortalLink } from "@/components/listing-portal-link";
import { DeletePropertyDialog } from "@/components/delete-property-dialog";
import { PropertyLifecycleAction } from "@/components/property-lifecycle-action";
import { GreenInfoBox, GreenInfoRow } from "@/components/ui/green-info-box";
import { Badge } from "@/components/ui/badge";
import { categorizeBlockingContract } from "@/lib/property-status";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; focus?: string; invited?: string }>;
}) {
  const { id } = await params;
  const { error, focus, invited } = await searchParams;
  const focusCandidatos = focus === "candidatos";
  const supabase = await createClient();

  const { data: property, error: fetchError } = await supabase
    .from("properties")
    .select(
      "id, address, photo_url, organization_id, broker_organization_id, status, listing_url, expected_rent_amount, expected_rent_currency, expected_term_months, expected_guarantee_amount, expected_guarantee_currency, property_landlords(organizations(id, name, type)), broker:organizations!properties_broker_organization_id_fkey(name), communes(name, regions(name))"
    )
    .eq("id", id)
    .single();
  if (fetchError || !property) notFound();

  // property_landlords se pobló históricamente 1:1 desde properties.organization_id
  // (ver 20260731100001_property_landlords_and_expected_terms.sql) asumiendo que
  // ese organization_id siempre es la organización arrendadora — pero una
  // propiedad puede quedar cargada directo bajo la organización de la
  // corredora (sin un arrendador individual separado todavía), y ahí
  // property_landlords termina con una organización tipo 'broker' adentro.
  // Se filtra por el tipo real: solo 'individual' cuenta como Arrendador;
  // si aparece una 'broker' ahí y broker_organization_id no está seteado,
  // esa es la corredora real de la propiedad, no un arrendador.
  const landlordOrgs = (property.property_landlords ?? [])
    .map((l) => one(l.organizations))
    .filter((o): o is { id: string; name: string; type: string } => !!o);
  const owners = landlordOrgs.filter((o) => o.type === "individual");
  const hasLandlord = owners.length > 0;
  const broker = one(property.broker) ?? landlordOrgs.find((o) => o.type === "broker") ?? null;
  const commune = one(property.communes);
  const region = commune ? one(commune.regions) : null;
  const hasListingDetails =
    property.listing_url || property.expected_rent_amount || property.expected_term_months || property.expected_guarantee_amount;

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, status, start_date, guarantee_amount, guarantee_currency")
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  // "Ocupada" = tiene un contrato que no terminó — mismo criterio que el
  // trigger property_candidates_block_if_occupied en la base, para que la
  // UI nunca muestre un buscador que la base va a rechazar igual. Ese
  // mismo contrato activo es la fuente del arrendatario a mostrar en la
  // cabecera — no se infiere de property_candidates (status
  // 'seleccionado') porque un contrato pudo haberse creado por el
  // camino directo, ya retirado (Opción C) pero todavía presente en
  // contratos viejos que no pasaron por evaluación de candidatos.
  const activeContract = (contracts ?? []).find((c) => c.status !== "finalizado" && c.status !== "cancelado");
  const isOccupied = !!activeContract;

  // Mismo contrato "vivo" de arriba, categorizado para elegir qué mensaje
  // mostrar si el corredor intenta marcar la propiedad fuera de cartera
  // (ver set_property_inactive en la base, que vuelve a validar esto
  // mismo antes de escribir — esto es solo para no mostrar un sheet
  // genérico cuando ya se sabe de antemano por qué está bloqueado).
  const blockingReason = activeContract ? categorizeBlockingContract(activeContract.status) : null;

  let tenantName: string | null = null;
  if (activeContract) {
    const { data: tenantPartyRows } = await supabase
      .from("contract_parties")
      .select("profiles(full_name)")
      .eq("contract_id", activeContract.id)
      .eq("role", "arrendatario");
    tenantName = tenantPartyRows?.[0] ? (one(tenantPartyRows[0].profiles)?.full_name ?? null) : null;
  }

  const { data: candidateRows } = await supabase
    .from("property_candidates")
    .select("id, status, contacts(id, full_name, email, status, user_id, profiles!contacts_user_id_fkey(avatar_url))")
    .eq("property_id", id)
    .order("created_at", { ascending: false });
  const candidates = (candidateRows ?? [])
    .map((c) => ({ id: c.id, status: c.status, contact: one(c.contacts) }))
    .filter(
      (
        c
      ): c is {
        id: string;
        status: string;
        contact: { id: string; full_name: string; email: string; status: string; user_id: string | null; profiles: { avatar_url: string | null }[] };
      } =>
        !!c.contact
    );
  const readyCandidates = candidates
    .filter((c) => c.status === "en_evaluacion" && c.contact.status === "confirmado")
    .map((c) => ({ id: c.id, fullName: c.contact.full_name }));

  // Evaluación de papeles, Etapa 2: estado del titular por candidatura,
  // si ya se le envió el link — consulta aparte en vez de un embed
  // porque hace falta filtrar por participant_type='titular' antes de
  // cruzar, y un embed simple de Supabase no filtra la tabla hija.
  // Suma income_type/identity_doc_type (Etapa 3/4) para la barra de
  // progreso documental de la tarjeta.
  const { data: participantRows } = candidates.length
    ? await supabase
        .from("candidate_participants")
        .select("id, property_candidate_id, status, income_type, identity_doc_type")
        .eq("participant_type", "titular")
        .in(
          "property_candidate_id",
          candidates.map((c) => c.id)
        )
    : { data: [] };
  type ParticipantRow = {
    id: string;
    property_candidate_id: string;
    status: string;
    income_type: CandidateIncomeType | null;
    identity_doc_type: CandidateIdentityDocType | null;
  };
  const participantsByCandidate = new Map<string, ParticipantRow>((participantRows ?? []).map((p) => [p.property_candidate_id, p as ParticipantRow]));
  const evaluationStatusByCandidate = new Map((participantRows ?? []).map((p) => [p.property_candidate_id, p.status]));

  // Documentos ya subidos por cada participante — misma tabla que usa
  // Etapa 3/4, una sola consulta para todos los candidatos de esta
  // propiedad en vez de una por tarjeta.
  const participantIds = (participantRows ?? []).map((p) => p.id);
  const { data: documentRows } = participantIds.length
    ? await supabase.from("candidate_documents").select("candidate_participant_id, document_type").in("candidate_participant_id", participantIds)
    : { data: [] };
  const documentsByParticipant = new Map<string, Set<CandidateDocumentType>>();
  for (const d of documentRows ?? []) {
    const set = documentsByParticipant.get(d.candidate_participant_id) ?? new Set<CandidateDocumentType>();
    set.add(d.document_type as CandidateDocumentType);
    documentsByParticipant.set(d.candidate_participant_id, set);
  }

  // Política de documentos de la propiedad — una sola vez para todos
  // los candidatos (no cambia por candidato), mismo criterio de capas
  // (propiedad, luego el org del corredor delegado si hay uno) que ya
  // usa la pantalla de política del corredor y la propia Etapa 4.
  const fallbackOrgId = property.broker_organization_id ?? property.organization_id;
  const needsPolicy = (participantRows ?? []).some((p) => p.income_type);
  const [{ data: propertyPolicyRows }, { data: orgPolicyRows }] = needsPolicy
    ? await Promise.all([
        supabase.from("property_document_policy").select("income_type, document_type, required").eq("property_id", id),
        supabase.from("org_document_policy").select("income_type, document_type, required").eq("organization_id", fallbackOrgId),
      ])
    : [{ data: null }, { data: null }];
  const orgPolicy = policyRowsToMap(orgPolicyRows);
  const propertyPolicy = policyRowsToMap(propertyPolicyRows);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {invited && (
        <Alert variant="success">
          <AlertDescription>
            Le enviamos a <strong>{invited}</strong> el link para presentar sus papeles.
          </AlertDescription>
        </Alert>
      )}

      <PropertyThumb url={property.photo_url} className="h-24 w-full rounded-xl sm:h-32" />

      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight md:text-2xl">{property.address}</h1>
          <Link
            href={`/properties/${id}/edit`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            title="Editar propiedad"
            aria-label="Editar propiedad"
          >
            <Pencil className="size-4" />
          </Link>
          <DeletePropertyDialog action={deleteProperty} propertyId={id} address={property.address} />
        </div>
        <p className="text-sm text-muted-foreground">
          {[commune?.name, region?.name].filter(Boolean).join(", ") || "Sin ubicación"}
        </p>
        {property.status === "inactiva" && (
          <div className="pt-1">
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Fuera de cartera
            </Badge>
          </div>
        )}
        {property.status !== "borrador" && (
          <div className="pt-1">
            <PropertyLifecycleAction
              propertyId={id}
              status={property.status}
              blockingReason={blockingReason}
              deactivateAction={deactivateProperty}
              reactivateAction={reactivateProperty}
            />
          </div>
        )}
      </div>

      {/* Participantes: antes tres chips (RoleBadge) sueltos junto al
          título — ahora una caja del mismo sistema verde que el resto
          de la app (ver /estilos), con el mismo criterio de contraste:
          rótulo y valor van en blanco pleno, la diferencia es de peso
          (un valor "vacío" — Sin asignar/Sin corredor/Sin adjudicar —
          va en regular en vez de bold, nunca en un color más apagado). */}
      <GreenInfoBox title="Participantes">
        <GreenInfoRow
          label="Arrendador"
          value={owners.length > 0 ? owners.map((o) => stripParticularSuffix(o.name)).join(", ") : "Sin asignar"}
          valueClassName={owners.length > 0 ? undefined : "font-normal"}
        />
        <GreenInfoRow label="Corredor" value={broker?.name ?? "Sin corredor"} valueClassName={broker?.name ? undefined : "font-normal"} />
        <GreenInfoRow label="Arrendatario" value={tenantName ?? "Sin adjudicar"} valueClassName={tenantName ? undefined : "font-normal"} />
      </GreenInfoBox>

      {hasListingDetails && (
        <GreenInfoBox title="Detalles de la propiedad" action={property.listing_url ? <ListingPortalLink url={property.listing_url} /> : undefined}>
          {property.expected_rent_amount && (
            <GreenInfoRow
              label="Valor de arriendo"
              value={formatMoney(property.expected_rent_amount, (property.expected_rent_currency as MoneyCurrency) ?? "CLP")}
            />
          )}
          {property.expected_term_months && <GreenInfoRow label="Plazo de arriendo" value={`${property.expected_term_months} meses`} />}
          {property.expected_guarantee_amount && (
            <GreenInfoRow
              label="Valor garantía"
              value={formatMoney(property.expected_guarantee_amount, (property.expected_guarantee_currency as MoneyCurrency) ?? "CLP")}
            />
          )}
        </GreenInfoBox>
      )}

      {/* Candidatos (Tanda D Fase 1): no se muestra si la propiedad ya
          tiene un contrato en curso — está ocupada, no admite candidatos
          nuevos (mismo criterio que el trigger en la base). "Elegir
          ganador" lleva al formulario de contrato precargado con los
          datos esperados de la propiedad — la creación real (y el paso
          de los demás candidatos a no_seleccionado) pasa recién ahí,
          vía select_winning_candidate(). */}
      {!isOccupied && (
        // Esta tarjeta es donde se toma la decisión importante (elegir al
        // arrendatario) — el acento dorado que el resto de las tarjetas
        // solo muestra al pasar el mouse (before:scale-y-0 en Card, ver
        // card.tsx) queda permanente acá, más un borde levemente más
        // definido. Mismo lenguaje visual del sistema, sin fondo de color
        // (eso se reserva para los avisos informativos) — para que
        // destaque sin leerse como una alerta.
        <Card
          id="candidatos-para-arrendar"
          className={cn(
            "scroll-mt-4 p-0 border-brand-gold/40 before:scale-y-100 transition-shadow duration-500",
            focusCandidatos && "ring-4 ring-brand-gold/60"
          )}
        >
          <ScrollIntoViewOnMount targetId="candidatos-para-arrendar" when={focusCandidatos} />
          <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">Candidatos para arrendar</h2>
                {candidates.length === 0 && (
                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">Empieza aquí</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Personas de tu libreta en evaluación para ser el arrendatario de esta propiedad.</p>
            </div>
          </div>
          <CardContent className="space-y-3 py-4">
            {candidates.length > 0 ? (
              <div className="space-y-3">
                {candidates.map((c) => {
                  const participant = participantsByCandidate.get(c.id);
                  const uploaded = participant ? (documentsByParticipant.get(participant.id) ?? new Set<CandidateDocumentType>()) : new Set<CandidateDocumentType>();
                  const progress = participant?.income_type
                    ? resolveCandidateProgress({
                        incomeType: participant.income_type,
                        identityDocType: participant.identity_doc_type,
                        orgPolicy,
                        propertyPolicy,
                        uploadedDocumentTypes: uploaded,
                      })
                    : null;
                  const avatarUrl = one(c.contact.profiles)?.avatar_url ?? null;
                  const detailKey = c.contact.user_id ?? `contact:${c.contact.id}`;
                  return (
                    <CandidateCard
                      key={c.id}
                      propertyCandidateId={c.id}
                      propertyId={id}
                      status={c.status}
                      fullName={c.contact.full_name}
                      email={c.contact.email}
                      avatarUrl={avatarUrl}
                      contactStatus={c.contact.status}
                      evaluationStatus={evaluationStatusByCandidate.get(c.id) ?? null}
                      progress={progress}
                      hasLandlord={hasLandlord}
                      detailHref={`/contacts/arrendatario/${encodeURIComponent(detailKey)}`}
                      sendEvaluationAction={startCandidateEvaluation}
                      discardAction={markCandidateNotSelected}
                      reactivateAction={reactivateCandidate}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin candidatos todavía.</p>
            )}
            <form action={addPropertyCandidate}>
              <input type="hidden" name="property_id" value={id} />
              <CandidateSearchField propertyId={id} inviteAction={inviteCandidateByEmail} />
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-medium">Contratos de esta propiedad</h2>
          {!isOccupied && <NewContractButton propertyId={id} hasLandlord={hasLandlord} readyCandidates={readyCandidates} />}
        </div>
        {contracts && contracts.length > 0 ? (
          <div className="divide-y">
            {contracts.map((c) => (
              <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50">
                <span className="tabular-nums">{formatMoney(c.guarantee_amount, c.guarantee_currency as MoneyCurrency)}</span>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        ) : (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Sin contratos todavía.</CardContent>
        )}
      </Card>
    </div>
  );
}
