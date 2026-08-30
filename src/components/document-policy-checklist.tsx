import {
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  DEFAULT_REQUIRED_DOCUMENTS,
  DOCUMENT_TYPE_LABELS,
  resolveDocumentRequired,
} from "@/lib/candidate-documents";

// Grilla de checkboxes agrupada por tipo de ingreso — un checkbox por
// (tipo de ingreso, tipo de documento), nombrado doc_${incomeType}_
// ${documentType} para que buildPolicyRows() (document-policy.ts) lo
// reconstruya del lado del server action. Server component puro: el
// estado inicial de cada checkbox se resuelve una sola vez al renderizar
// (defaultChecked), sin necesidad de "use client" — el formulario que
// lo envuelve ya hace todo el trabajo con una Server Action normal.
//
// `layers` se pasa en orden de más a menos específico (ej. en la
// propiedad: [propertyRows, orgRows]; en la organización: [orgRows]) —
// resolveDocumentRequired usa la primera capa que tenga una fila para
// esa casilla, y si ninguna la tiene, cae al default de la spec.
export function DocumentPolicyChecklist({
  layers,
  idPrefix,
}: {
  layers: (Map<string, boolean> | null | undefined)[];
  idPrefix: string;
}) {
  return (
    <div className="space-y-5">
      {INCOME_TYPES.map((incomeType) => (
        <div key={incomeType} className="space-y-2">
          <p className="text-sm font-medium">{INCOME_TYPE_LABELS[incomeType]}</p>
          <div className="space-y-2 rounded-lg border p-3">
            {DEFAULT_REQUIRED_DOCUMENTS[incomeType].map((documentType) => {
              const checked = resolveDocumentRequired(incomeType, documentType, ...layers);
              const name = `doc_${incomeType}_${documentType}`;
              const id = `${idPrefix}_${name}`;
              return (
                <label key={documentType} htmlFor={id} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" id={id} name={name} defaultChecked={checked} className="size-4 shrink-0 accent-primary" />
                  {DOCUMENT_TYPE_LABELS[documentType]}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
