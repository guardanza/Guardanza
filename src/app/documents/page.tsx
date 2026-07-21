import { redirect } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { uploadApplicantDocument, deleteApplicantDocument } from "@/lib/actions/documents";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const DOCUMENT_TYPES: Record<string, string> = {
  cedula_identidad: "Cédula de identidad",
  liquidaciones_sueldo: "Liquidaciones de sueldo (3-6 meses)",
  contrato_trabajo: "Contrato de trabajo / certificado de antigüedad",
  certificado_afp: "Certificado de cotizaciones AFP",
  declaracion_renta: "Declaración de impuesto a la renta (F22)",
  boletas_honorarios: "Boletas de honorarios / carpeta tributaria",
  escritura_empresa: "Escritura de constitución de la empresa",
  certificado_vigencia: "Certificado de vigencia y personería",
  informe_comercial: "Informe comercial (Dicom / Equifax)",
  certificado_antecedentes: "Certificado de antecedentes",
  otro: "Otro",
};

// Grouped the way the checklist a broker actually reviews is grouped —
// dependiente / independiente / empresa each need a different subset.
const GROUPS: { label: string; types: string[] }[] = [
  { label: "Trabajador dependiente", types: ["cedula_identidad", "liquidaciones_sueldo", "contrato_trabajo", "certificado_afp"] },
  { label: "Trabajador independiente / honorarios", types: ["cedula_identidad", "declaracion_renta", "boletas_honorarios"] },
  { label: "Persona jurídica (empresa)", types: ["escritura_empresa", "certificado_vigencia", "declaracion_renta"] },
  { label: "Comunes", types: ["informe_comercial", "certificado_antecedentes", "otro"] },
];

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login");

  const { data: documents } = await supabase
    .from("applicant_documents")
    .select("id, document_type, storage_path, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:px-6 md:py-10">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Análisis de documentos</h1>
        <p className="text-sm text-muted-foreground">
          Sube tus documentos para evaluación de arriendo. Por ahora solo se guardan — el análisis automático llega después.
        </p>
      </div>

      <Card className="p-0">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Tus documentos</h2>
        </div>
        {documents && documents.length > 0 ? (
          <div className="divide-y">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-muted-foreground" strokeWidth={2} />
                  <span className="text-sm">{DOCUMENT_TYPES[d.document_type] ?? d.document_type}</span>
                </div>
                <form action={deleteApplicantDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="storage_path" value={d.storage_path} />
                  <button type="submit" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Sin documentos subidos todavía.</CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subir documento</CardTitle>
          <CardDescription>Elige el tipo según tu situación laboral.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadApplicantDocument} className="space-y-3">
            <select name="document_type" required className={selectClass} defaultValue="">
              <option value="" disabled>
                Selecciona el tipo de documento
              </option>
              {GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.types.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPES[t]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input type="file" name="file" required className="block w-full text-sm" />
            <Button type="submit" className="w-full">
              Subir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
