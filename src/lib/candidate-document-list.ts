// Evaluación de papeles, Etapa 4 — cruce identidad × tipo de ingreso ×
// las 2 capas de política (org, propiedad) en la lista real que ve el
// candidato. Extiende resolveDocumentRequired (Etapa 1), no lo
// duplica: esa función ya resuelve "¿está exigido esto?" capa por
// capa — acá se arma la lista completa a partir de eso, más las dos
// reglas fijas que no son parte de esa matriz (visa por pasaporte,
// informe comercial como caso especial).
import {
  DEFAULT_REQUIRED_DOCUMENTS,
  DOCUMENT_TYPE_LABELS,
  resolveDocumentRequired,
  type CandidateDocumentType,
  type CandidateIdentityDocType,
  type CandidateIncomeType,
} from "@/lib/candidate-documents";

export type CandidateDocumentRowKind = "subir" | "informe_comercial" | "eximido";

export interface CandidateDocumentRow {
  documentType: CandidateDocumentType;
  label: string;
  kind: CandidateDocumentRowKind;
  // Solo tiene sentido para kind "subir" — si ya hay una fila en
  // candidate_documents para este tipo (incluye los de identidad,
  // subidos en la pantalla anterior: es la misma tabla, no hace falta
  // ninguna lógica extra para que ya salgan "Subido").
  uploaded: boolean;
}

// La identidad (cédula/pasaporte, frontal/reverso, selfie con
// documento) no pasa por acá — ya se resolvió en la pantalla anterior
// (Etapa 3) y no es parte de la matriz de política por tipo de ingreso.
const IDENTITY_DOCUMENT_TYPES: ReadonlySet<CandidateDocumentType> = new Set([
  "cedula_identidad",
  "cedula_identidad_reverso",
  "pasaporte",
  "selfie_con_documento",
]);

export function resolveCandidateDocumentList(params: {
  incomeType: CandidateIncomeType;
  identityDocType: CandidateIdentityDocType;
  orgPolicy: Map<string, boolean>;
  propertyPolicy: Map<string, boolean>;
  uploadedDocumentTypes: ReadonlySet<CandidateDocumentType>;
}): CandidateDocumentRow[] {
  const { incomeType, identityDocType, orgPolicy, propertyPolicy, uploadedDocumentTypes } = params;

  const documentTypes = DEFAULT_REQUIRED_DOCUMENTS[incomeType].filter((dt) => !IDENTITY_DOCUMENT_TYPES.has(dt));

  const rows: CandidateDocumentRow[] = documentTypes.map((documentType) => {
    // Capa de propiedad manda sobre la de org, que manda sobre el
    // default de la spec — mismo orden que ya usa la pantalla de
    // política del corredor (property-document-policy.tsx).
    const required = resolveDocumentRequired(incomeType, documentType, propertyPolicy, orgPolicy);
    if (!required) {
      return { documentType, label: DOCUMENT_TYPE_LABELS[documentType], kind: "eximido", uploaded: false };
    }
    if (documentType === "informe_comercial") {
      // Nunca se pide subir esto — lo "obtiene" el corredor. El
      // enchufe real (screeningProvider.check(rut), en
      // src/lib/adapters/screening/) todavía no se llama desde
      // ningún lado — esta fila es a propósito solo la nota, sin
      // disparar ninguna consulta real todavía.
      return { documentType, label: DOCUMENT_TYPE_LABELS[documentType], kind: "informe_comercial", uploaded: false };
    }
    return {
      documentType,
      label: DOCUMENT_TYPE_LABELS[documentType],
      kind: "subir",
      uploaded: uploadedDocumentTypes.has(documentType),
    };
  });

  // Visa/permanencia definitiva: regla fija, no gobernada por política
  // (ver el comentario junto a DEFAULT_REQUIRED_DOCUMENTS) — siempre
  // exigida a quien se identificó con pasaporte, nunca una casilla que
  // el corredor pueda apagar.
  if (identityDocType === "pasaporte_extranjero") {
    rows.push({
      documentType: "visa_permanencia_definitiva",
      label: DOCUMENT_TYPE_LABELS.visa_permanencia_definitiva,
      kind: "subir",
      uploaded: uploadedDocumentTypes.has("visa_permanencia_definitiva"),
    });
  }

  return rows;
}

export interface CandidateDocumentProgress {
  uploaded: number;
  total: number;
}

// Resumen para la tarjeta de candidato en la ficha de propiedad (no la
// pantalla del propio candidato) — "X de Y" sobre solo lo que pesa de
// verdad: filas tipo "subir" más la identidad como UN ítem propio, no
// tres (frontal+reverso+selfie cuentan como "Identidad" completa o no,
// no tres casilleros separados — resolveCandidateDocumentList ya las
// excluye a propósito de su lista, por el mismo motivo). Ni informe
// comercial ni eximidos entran en el conteo — ninguno de los dos es
// algo que la persona pueda "tener pendiente".
//
// null cuando todavía no hay income_type (evaluación sin iniciar, o en
// curso pero no llegó al paso de tipo de ingreso) — no hay suficiente
// para calcular la matriz todavía; quien llama decide cómo mostrarlo
// (spec: "resuélvelo con elegancia", no una barra vacía).
export function resolveCandidateProgress(params: {
  incomeType: CandidateIncomeType | null;
  identityDocType: CandidateIdentityDocType | null;
  orgPolicy: Map<string, boolean>;
  propertyPolicy: Map<string, boolean>;
  uploadedDocumentTypes: ReadonlySet<CandidateDocumentType>;
}): CandidateDocumentProgress | null {
  const { incomeType, uploadedDocumentTypes } = params;
  if (!incomeType) return null;
  const identityDocType = params.identityDocType ?? "cedula_chilena";

  const hasFrontal = uploadedDocumentTypes.has("cedula_identidad") || uploadedDocumentTypes.has("pasaporte");
  const hasReverso = uploadedDocumentTypes.has("cedula_identidad_reverso");
  const hasSelfie = uploadedDocumentTypes.has("selfie_con_documento");
  const identityDone = (identityDocType === "pasaporte_extranjero" ? hasFrontal : hasFrontal && hasReverso) && hasSelfie;

  const subirRows = resolveCandidateDocumentList({
    incomeType,
    identityDocType,
    orgPolicy: params.orgPolicy,
    propertyPolicy: params.propertyPolicy,
    uploadedDocumentTypes,
  }).filter((r) => r.kind === "subir");

  return {
    uploaded: (identityDone ? 1 : 0) + subirRows.filter((r) => r.uploaded).length,
    total: 1 + subirRows.length,
  };
}
