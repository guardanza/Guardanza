// Catálogo de documentos de Evaluación de papeles — fuente única de
// verdad, compartida por la política del corredor (Etapa 1) y, más
// adelante, por la lista derivada que ve el invitado (Etapa 4) y la
// vista de revisión del corredor (Etapa 7). Mirror en TypeScript del
// enum candidate_document_type (20260830100001_org_document_policy.sql)
// — igual que RoleBucket ya hace con contract_role, sin generar tipos
// desde la base (database.types.ts sigue siendo un placeholder).
export type CandidateDocumentType =
  | "cedula_identidad"
  | "pasaporte"
  | "visa_permanencia_definitiva"
  | "liquidaciones_sueldo"
  | "certificado_afp"
  | "contrato_trabajo"
  | "carpeta_tributaria_sii"
  | "boletas_honorarios"
  | "cartola_bancaria"
  | "liquidaciones_pension"
  | "certificado_afiliacion_ips_afp"
  | "informe_comercial";

export type CandidateIncomeType = "dependiente" | "independiente" | "pensionado";

export const INCOME_TYPE_LABELS: Record<CandidateIncomeType, string> = {
  dependiente: "Trabajador dependiente",
  independiente: "Trabajador independiente",
  pensionado: "Pensionado(a)",
};

export const DOCUMENT_TYPE_LABELS: Record<CandidateDocumentType, string> = {
  cedula_identidad: "Cédula de identidad",
  pasaporte: "Pasaporte",
  visa_permanencia_definitiva: "Visa o permanencia definitiva vigente",
  liquidaciones_sueldo: "Últimas 3 liquidaciones de sueldo",
  certificado_afp: "Certificado de cotizaciones AFP (12 meses)",
  contrato_trabajo: "Contrato de trabajo",
  carpeta_tributaria_sii: "Carpeta tributaria (SII)",
  boletas_honorarios: "Últimas 6 boletas de honorarios",
  cartola_bancaria: "Cartola bancaria (3–6 meses)",
  liquidaciones_pension: "Últimas 3 liquidaciones de pensión",
  certificado_afiliacion_ips_afp: "Certificado de afiliación IPS/AFP",
  informe_comercial: "Informe comercial",
};

// Qué documentos son configurables PARA CADA tipo de ingreso — la base
// que la política del corredor puede overridear (org_document_policy /
// property_document_policy, ambas "sin fila = usa este default").
// Deliberadamente NO incluye pasaporte/visa_permanencia_definitiva acá:
// esos los exige identity_doc_type (cédula vs pasaporte), no el tipo de
// ingreso — no son parte de esta matriz, se resuelven aparte (Etapa 4).
export const DEFAULT_REQUIRED_DOCUMENTS: Record<CandidateIncomeType, CandidateDocumentType[]> = {
  dependiente: ["cedula_identidad", "liquidaciones_sueldo", "certificado_afp", "contrato_trabajo", "informe_comercial"],
  independiente: ["cedula_identidad", "carpeta_tributaria_sii", "boletas_honorarios", "cartola_bancaria", "informe_comercial"],
  pensionado: ["cedula_identidad", "liquidaciones_pension", "certificado_afiliacion_ips_afp", "informe_comercial"],
};

export const INCOME_TYPES: CandidateIncomeType[] = ["dependiente", "independiente", "pensionado"];

// Helpers de resolución para prellenar los checkboxes de política — NO
// es el resolver completo de la Etapa 4 (ese además cruza
// identity_doc_type y las excepciones por candidato de la Etapa 7).
// Acá solo hace falta "¿qué capa manda para esta casilla, mostrando la
// más específica primero?" — org_document_policy usa un solo layer
// (el default), property_document_policy usa dos (property, luego org).
export function policyRowsToMap(
  rows: { income_type: string; document_type: string; required: boolean }[] | null | undefined
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const r of rows ?? []) map.set(`${r.income_type}:${r.document_type}`, r.required);
  return map;
}

export function resolveDocumentRequired(
  incomeType: CandidateIncomeType,
  documentType: CandidateDocumentType,
  ...layers: (Map<string, boolean> | null | undefined)[]
): boolean {
  const key = `${incomeType}:${documentType}`;
  for (const layer of layers) {
    if (layer?.has(key)) return layer.get(key)!;
  }
  return DEFAULT_REQUIRED_DOCUMENTS[incomeType].includes(documentType);
}
