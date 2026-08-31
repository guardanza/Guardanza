"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { assessPhotoQuality, downscaleForAnalysis, canvasToUploadBlob, fileToCanvas } from "@/lib/identity-photo-processing";

// Camino de archivo — default en desktop (spec sección 9: "para
// identidad, opción principal en PC = enviar link al celular"; las
// sesiones vinculadas quedan fuera del v1, así que en PC el camino real
// es este, arrastre/archivo), y respaldo en mobile cuando la cámara no
// está disponible o la persona prefiere no usarla. Mismo chequeo de
// calidad que la cámara en vivo — "no cosmético" aplica también acá,
// no solo al camino en vivo.
export function IdentityFileCapture({
  onAccept,
  onSwitchToCamera,
  showCameraOption,
}: {
  onAccept: (blob: Blob) => void | Promise<void>;
  onSwitchToCamera?: () => void;
  showCameraOption: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [issue, setIssue] = useState<"blurry" | "glare" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const canvas = await fileToCanvas(file);
      const quality = assessPhotoQuality(downscaleForAnalysis(canvas));
      const blob = await canvasToUploadBlob(canvas);
      setReviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setReviewBlob(blob);
      setIssue(quality.blurry ? "blurry" : quality.glare ? "glare" : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar la imagen.");
    }
  }, []);

  const retake = useCallback(() => {
    setReviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setReviewBlob(null);
    setIssue(null);
    setError(null);
  }, []);

  const accept = useCallback(async () => {
    if (!reviewBlob) return;
    setUploading(true);
    await onAccept(reviewBlob);
  }, [reviewBlob, onAccept]);

  if (reviewUrl) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={reviewUrl} alt="" className={cn("mx-auto max-h-80 w-full object-contain", uploading && "opacity-50")} />
        </div>
        {issue && (
          <Alert variant="destructive">
            <AlertDescription>
              {issue === "blurry"
                ? "La foto salió borrosa — prueba con una imagen más nítida, o con buena luz si la vas a fotografiar."
                : "Hay un reflejo que tapa la cédula — prueba con otra foto."}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button type="button" variant={issue ? "default" : "outline"} onClick={retake} disabled={uploading} className="flex-1">
            <RotateCcw className="size-4" />
            Elegir otra
          </Button>
          <Button type="button" variant={issue ? "outline" : "default"} onClick={accept} disabled={uploading} className="flex-1">
            {uploading ? "Subiendo…" : issue ? "Usar de todos modos" : "Usar esta foto"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          "flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
        )}
      >
        <Upload className="size-6 text-muted-foreground" strokeWidth={1.5} />
        <p className="px-4 text-sm text-muted-foreground">Arrastra la foto acá, o haz clic para elegirla</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {showCameraOption && onSwitchToCamera && (
        <button type="button" onClick={onSwitchToCamera} className="block w-full text-center text-xs text-muted-foreground underline">
          o usa la cámara en vivo
        </button>
      )}
    </div>
  );
}
