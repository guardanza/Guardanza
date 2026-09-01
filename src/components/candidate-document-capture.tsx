"use client";

import { useCallback, useState } from "react";
import { Upload, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { assessPhotoQuality, downscaleForAnalysis, canvasToUploadBlob, fileToCanvas } from "@/lib/identity-photo-processing";

// Documentos no-identidad (liquidaciones, cartola, carpeta tributaria…)
// normalmente se descargan como PDF, no se fotografían — a diferencia
// de identity-file-capture.tsx (solo imagen, con el marco/quality-check
// que sí tiene sentido para una cédula), acá se acepta PDF además de
// imagen. Sin cámara en vivo propia: el selector de archivo nativo del
// celular ya ofrece "Tomar foto" como una de sus opciones, así que no
// hace falta duplicar esa UI para documentos que no necesitan el marco
// guía ni el chequeo de nitidez/reflejo de un documento de identidad.
const MAX_PDF_BYTES = 8 * 1024 * 1024;

type Selection = { kind: "image"; blob: Blob; previewUrl: string; issue: "blurry" | "glare" | null } | { kind: "pdf"; blob: Blob; fileName: string };

export function CandidateDocumentCapture({ onAccept }: { onAccept: (blob: Blob, contentType: string) => Promise<void> }) {
  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      if (file.type === "application/pdf") {
        if (file.size > MAX_PDF_BYTES) throw new Error("El PDF no puede pesar más de 8MB.");
        setSelection({ kind: "pdf", blob: file, fileName: file.name });
        return;
      }
      const canvas = await fileToCanvas(file);
      const quality = assessPhotoQuality(downscaleForAnalysis(canvas));
      const blob = await canvasToUploadBlob(canvas);
      setSelection((prev) => {
        if (prev?.kind === "image") URL.revokeObjectURL(prev.previewUrl);
        return { kind: "image", blob, previewUrl: URL.createObjectURL(blob), issue: quality.blurry ? "blurry" : quality.glare ? "glare" : null };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar el archivo.");
    }
  }, []);

  const retake = useCallback(() => {
    setSelection((prev) => {
      if (prev?.kind === "image") URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setError(null);
  }, []);

  const accept = useCallback(async () => {
    if (!selection) return;
    setUploading(true);
    try {
      const contentType = selection.kind === "pdf" ? "application/pdf" : "image/webp";
      await onAccept(selection.blob, contentType);
    } catch {
      // onAccept ya deja el mensaje en el Alert del padre — acá solo
      // hace falta reactivar los botones para poder reintentar (mismo
      // criterio que identity-file-capture/identity-camera-capture).
      setUploading(false);
    }
  }, [selection, onAccept]);

  if (selection) {
    const issue = selection.kind === "image" ? selection.issue : null;
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl bg-muted">
          {selection.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selection.previewUrl} alt="" className={cn("mx-auto max-h-64 w-full object-contain", uploading && "opacity-50")} />
          ) : (
            <div className={cn("flex items-center gap-2 px-4 py-6", uploading && "opacity-50")}>
              <FileText className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <span className="truncate text-sm">{selection.fileName}</span>
            </div>
          )}
        </div>
        {issue && (
          <Alert variant="destructive">
            <AlertDescription>
              {issue === "blurry"
                ? "La foto salió borrosa — prueba con una imagen más nítida."
                : "Hay un reflejo que tapa el documento — prueba con otra foto."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button type="button" variant={issue ? "default" : "outline"} onClick={retake} disabled={uploading} className="flex-1">
            <RotateCcw className="size-4" />
            Elegir otro
          </Button>
          <Button type="button" variant={issue ? "outline" : "default"} onClick={accept} disabled={uploading} className="flex-1">
            {uploading ? "Subiendo…" : issue ? "Usar de todos modos" : "Usar este archivo"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex aspect-[3/1] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
        )}
      >
        <Upload className="size-5 text-muted-foreground" strokeWidth={1.5} />
        <p className="px-4 text-xs text-muted-foreground">Arrastra el archivo acá, o haz clic para elegirlo (foto o PDF)</p>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
    </div>
  );
}
