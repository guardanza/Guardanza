import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/supabase/one";
import type { MoneyCurrency } from "@/lib/money";
import type { CandidateDocumentType, CandidateIdentityDocType, CandidateIncomeType } from "@/lib/candidate-documents";
import { policyRowsToMap } from "@/lib/candidate-documents";
import { resolveCandidateDocumentList } from "@/lib/candidate-document-list";
import type { CandidateParticipantType } from "@/lib/candidate-participant-messaging";
import { WelcomeScreen } from "@/components/candidate-evaluation/welcome-screen";
import { IdentityScreen } from "@/components/candidate-evaluation/identity-screen";
import { IncomeTypeScreen } from "@/components/candidate-evaluation/income-type-screen";
import { DocumentListScreen } from "@/components/candidate-evaluation/document-list-screen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signOut } from "@/lib/actions/auth";

// Un default razonable, no una detección infalible — el propio link
// para "cambiar" (spec sección 9) es lo que de verdad importa; esto
// solo decide con qué arranca la pantalla.
function looksLikeMobile(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
}

export default async function CandidateEvaluationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paso?: string; error?: string }>;
}) {
  const { id } = await params;
  const { paso, error } = await searchParams;

  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: participant } = await supabase
    .from("candidate_participants")
    .select("id, participant_type, full_name, email, status, income_type, identity_doc_type, property_candidate_id, created_by, user_id")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      participant_type: CandidateParticipantType;
      full_name: string;
      email: string;
      status: string;
      income_type: CandidateIncomeType | null;
      identity_doc_type: CandidateIdentityDocType | null;
      property_candidate_id: string;
      created_by: string;
      user_id: string | null;
    }>();
  // La RLS ya deja esta fila invisible para cualquiera que no sea el
  // propio participante o un miembro de la organización — si no
  // apareció nada, no existe o no es de esta persona, mismo trato.
  if (!participant) notFound();

  // La RLS también deja ver esta fila a un miembro de la organización
  // (para que el corredor pueda seguir el avance), pero el flujo guiado
  // en sí SIEMPRE es la propia persona (spec: consentimiento, sobre
  // todo para un codeudor) — si quien está conectado no es
  // participant.user_id, no es "no tiene acceso" (eso ya lo filtró la
  // RLS), es "está con la cuenta equivocada". Pasa sobre todo cuando ya
  // había sesión abierta en el navegador al tocar el link de invitación
  // y /login la reusó en vez de pedir la cuenta correcta — sin este
  // aviso, la persona avanza toda la pantalla y recién se entera al
  // fallar la subida de la foto, sin ninguna pista de por qué.
  if (participant.user_id !== userRes.user.id) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:py-10">
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <CardHeader className="p-0">
              <CardTitle>Cuenta equivocada</CardTitle>
              <CardDescription>
                Esta postulación es de {participant.full_name} ({participant.email}), pero estás conectado con otra
                cuenta. Cierra sesión e inicia sesión con esa cuenta para continuar.
              </CardDescription>
            </CardHeader>
            <form action={signOut}>
              <input type="hidden" name="next" value={`/evaluacion/postulacion/${id}`} />
              <button type="submit" className="w-full rounded-lg border px-4 py-3 text-center text-sm font-medium text-destructive">
                Cerrar sesión
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ data: propertyCandidate }, { data: documents }, { data: inviterProfile }] = await Promise.all([
    supabase
      .from("property_candidates")
      .select(
        "properties(id, address, expected_rent_amount, expected_rent_currency, expected_guarantee_amount, expected_guarantee_currency, organization_id, broker_organization_id)"
      )
      .eq("id", participant.property_candidate_id)
      .single(),
    supabase.from("candidate_documents").select("document_type").eq("candidate_participant_id", id),
    supabase.from("profiles").select("full_name").eq("id", participant.created_by).maybeSingle<{ full_name: string }>(),
  ]);
  const property = one(propertyCandidate?.properties);
  if (!property) notFound();

  const documentTypes = new Set<CandidateDocumentType>((documents ?? []).map((d) => d.document_type as CandidateDocumentType));
  const hasFrontal = documentTypes.has("cedula_identidad") || documentTypes.has("pasaporte");
  const hasReverso = documentTypes.has("cedula_identidad_reverso");
  const hasSelfie = documentTypes.has("selfie_con_documento");
  const identityDone =
    (participant.identity_doc_type === "pasaporte_extranjero"
      ? hasFrontal
      : participant.identity_doc_type === "cedula_chilena"
        ? hasFrontal && hasReverso
        : false) && hasSelfie;

  // Capa de propiedad, luego la de org — el corredor delegado manda por
  // sobre la del dueño si hay uno (fallbackOrgId, mismo criterio que la
  // pantalla de política del corredor en properties/[id]/edit). Solo se
  // consultan una vez que income_type ya existe — antes de eso no hay
  // nada que resolver todavía.
  const fallbackOrgId = property.broker_organization_id ?? property.organization_id;
  const [{ data: propertyPolicyRows }, { data: orgPolicyRows }] = participant.income_type
    ? await Promise.all([
        supabase.from("property_document_policy").select("income_type, document_type, required").eq("property_id", property.id),
        supabase.from("org_document_policy").select("income_type, document_type, required").eq("organization_id", fallbackOrgId),
      ])
    : [{ data: null }, { data: null }];

  const documentRows = participant.income_type
    ? resolveCandidateDocumentList({
        incomeType: participant.income_type,
        identityDocType: participant.identity_doc_type ?? "cedula_chilena",
        orgPolicy: policyRowsToMap(orgPolicyRows),
        propertyPolicy: policyRowsToMap(propertyPolicyRows),
        uploadedDocumentTypes: documentTypes,
      })
    : [];

  // Sin ?paso=, la pantalla se deriva de qué datos ya existen — así
  // "retoma desde el mismo link" (spec sección 2) funciona solo, sin
  // guardar un "paso actual" en ningún lado. ?paso= es solo para las
  // dos transiciones que SÍ necesitan una señal explícita: "Empezar"
  // (bienvenida → identidad, cuando todavía no hay ningún dato que lo
  // indique) y "Volver" (tipo de ingreso → identidad).
  const nothingStarted = !participant.identity_doc_type && !hasFrontal;
  const step =
    paso === "identidad"
      ? "identidad"
      : paso === "ingreso"
        ? "ingreso"
        : nothingStarted
          ? "bienvenida"
          : !identityDone
            ? "identidad"
            : !participant.income_type
              ? "ingreso"
              : "documentos";

  const isMobile = looksLikeMobile((await headers()).get("user-agent"));

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6 md:py-10">
      {step !== "bienvenida" && step !== "documentos" && (
        <Link href={`/evaluacion/postulacion/${id}?paso=identidad`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
          Volver
        </Link>
      )}

      {/* La propiedad siempre visible en el encabezado (spec sección 2). */}
      <div className="rounded-xl border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">Postulando a</p>
        <p className="truncate text-sm font-medium">{property.address}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {step === "bienvenida" && (
            <WelcomeScreen
              fullName={participant.full_name}
              email={participant.email}
              participantType={participant.participant_type}
              propertyAddress={property.address}
              inviterName={inviterProfile?.full_name ?? "Tu corredor(a)"}
              rentAmount={property.expected_rent_amount}
              rentCurrency={property.expected_rent_currency as MoneyCurrency | null}
              guaranteeAmount={property.expected_guarantee_amount}
              guaranteeCurrency={property.expected_guarantee_currency as MoneyCurrency | null}
              startHref={`/evaluacion/postulacion/${id}?paso=identidad`}
            />
          )}
          {step === "identidad" && (
            <IdentityScreen
              candidateParticipantId={id}
              isMobile={isMobile}
              initialIdentityDocType={participant.identity_doc_type}
              hasFrontal={hasFrontal}
              hasReverso={hasReverso}
              hasSelfie={hasSelfie}
            />
          )}
          {step === "ingreso" && <IncomeTypeScreen candidateParticipantId={id} />}
          {step === "documentos" && <DocumentListScreen candidateParticipantId={id} rows={documentRows} />}
        </CardContent>
      </Card>
    </div>
  );
}
