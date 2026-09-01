"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera as CameraIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { assessPhotoQuality, downscaleForAnalysis, canvasToUploadBlob, clampCanvasDimensions } from "@/lib/identity-photo-processing";
import { cn } from "@/lib/utils";

type CaptureState = "requesting" | "live" | "denied" | "unsupported" | "review" | "uploading";

// Cámara guiada en vivo (spec sección 10) — getUserMedia + un <video>
// real con el marco proporción tarjeta y esquinas guía SUPERPUESTOS
// mientras se encuadra, no un selector nativo de cámara del sistema
// (que no deja dibujar nada encima mientras apunta). Decisión tomada
// con el usuario: más trabajo de construir, pero es lo que la spec
// describe de verdad.
//
// getUserMedia exige un contexto seguro (HTTPS o localhost) — sin eso
// el navegador ni siquiera expone mediaDevices, por lo que "unsupported"
// cubre tanto navegadores viejos como el caso de estar en HTTP.
export function IdentityCameraCapture({
  instruction,
  onAccept,
  onSwitchToFile,
  // "document": cámara trasera + marco proporción tarjeta (cédula/
  // pasaporte). "selfie": cámara frontal, sin el marco de tarjeta (no
  // tiene sentido para una cara) y con el aviso de reflejo/nitidez en
  // términos de "la foto", no "la cédula".
  variant = "document",
}: {
  instruction: string;
  onAccept: (blob: Blob) => void | Promise<void>;
  onSwitchToFile: () => void;
  variant?: "document" | "selfie";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CaptureState>("requesting");
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [issue, setIssue] = useState<"blurry" | "glare" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: variant === "selfie" ? "user" : "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("live");
      } catch {
        // Permiso rechazado, sin cámara disponible, o cualquier otro
        // fallo de hardware — todos caen al mismo camino de respaldo
        // (subir archivo), no hace falta distinguir el motivo exacto
        // para la persona.
        if (!cancelled) setState("denied");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- variant no cambia en la vida de una instancia (identity-screen.tsx monta una instancia nueva por paso, vía key={step})
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // La cámara real de un teléfono entrega mucho más que el "ideal"
    // pedido más arriba — sin este tope, la foto capturada acá subía a
    // resolución nativa (varios MB) y la subida se colgaba en una red
    // móvil sin nunca fallar ni avisar.
    const uploadCanvas = clampCanvasDimensions(canvas);
    const quality = assessPhotoQuality(downscaleForAnalysis(uploadCanvas));
    canvasToUploadBlob(uploadCanvas).then((blob) => {
      setReviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setReviewBlob(blob);
      setIssue(quality.blurry ? "blurry" : quality.glare ? "glare" : null);
      setState("review");
    });
  }, []);

  const retake = useCallback(() => {
    setReviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setReviewBlob(null);
    setIssue(null);
    setState("live");
  }, []);

  const accept = useCallback(async () => {
    if (!reviewBlob) return;
    setState("uploading");
    try {
      await onAccept(reviewBlob);
    } catch {
      // onAccept ya deja el mensaje en el Alert del padre — acá solo
      // hace falta volver a "review" para que la persona pueda repetir
      // o reintentar, en vez de quedar viendo "Subiendo…" para siempre
      // (el bug real que se encontró en un Android físico).
      setState("review");
    }
  }, [reviewBlob, onAccept]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-black">
        {/* El <video> queda SIEMPRE montado (nunca condicionado por
            state) — antes se desmontaba al pasar a "review" y React
            destruía el elemento; al volver a "live" con Repetir, el
            <video> nuevo nunca recibía de vuelta el stream (el efecto
            que lo asigna corre una sola vez, al montar el componente),
            así que el visor quedaba negro. Ahora solo se oculta con
            CSS — el mismo elemento, con el mismo stream, sigue vivo
            debajo en todo momento. */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn("h-full w-full object-cover", state !== "requesting" && state !== "live" && "hidden")}
        />
        {(state === "requesting" || state === "live") && variant === "document" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative w-full" style={{ aspectRatio: "1.586" }}>
              <span className="absolute top-0 left-0 size-7 rounded-tl-lg border-t-4 border-l-4 border-white/90" />
              <span className="absolute top-0 right-0 size-7 rounded-tr-lg border-t-4 border-r-4 border-white/90" />
              <span className="absolute bottom-0 left-0 size-7 rounded-bl-lg border-b-4 border-l-4 border-white/90" />
              <span className="absolute right-0 bottom-0 size-7 rounded-br-lg border-r-4 border-b-4 border-white/90" />
            </div>
          </div>
        )}
        {(state === "requesting" || state === "live") && variant === "selfie" && (
          // Óvalo para la cara arriba, tarjeta más chica abajo — dos
          // guías, no una (spec: mostrar dónde va la cara Y dónde va la
          // cédula, no solo un óvalo genérico). Proporciones aprobadas
          // por el usuario a mano, en un mockup — viewBox fijo 300×400
          // (misma proporción 3:4 del contenedor) para que escale igual
          // sea cual sea el tamaño real en pantalla.
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <ellipse cx="150" cy="140" rx="74" ry="102" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.9)" strokeWidth="3" />
            <rect x="40" y="252" width="220" height="138" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.9)" strokeWidth="3" />
          </svg>
        )}
        {state === "requesting" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Pidiendo acceso a la cámara…</div>
        )}
        {(state === "review" || state === "uploading") && reviewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reviewUrl} alt="" className={cn("absolute inset-0 h-full w-full object-contain", state === "uploading" && "opacity-50")} />
        )}
      </div>

      {(state === "requesting" || state === "live") && (
        <>
          <p className="text-center text-sm text-muted-foreground">{instruction}</p>
          <Button type="button" onClick={capture} disabled={state !== "live"} className="w-full">
            <CameraIcon className="size-4" />
            Tomar foto
          </Button>
          <button type="button" onClick={onSwitchToFile} className="block w-full text-center text-xs text-muted-foreground underline">
            o sube el archivo en vez de usar la cámara
          </button>
        </>
      )}

      {state === "review" && (
        <div className="space-y-2">
          {issue && (
            <Alert variant="destructive">
              <AlertDescription>
                {issue === "blurry"
                  ? variant === "selfie"
                    ? "La foto salió borrosa — prueba de nuevo, con buena luz y sin moverte al tomarla."
                    : "La foto salió borrosa — prueba de nuevo, con buena luz y la cámara firme sobre una superficie plana."
                  : variant === "selfie"
                    ? "Hay un reflejo que tapa parte de la foto — cambia el ángulo o aléjate de la luz directa."
                    : "Hay un reflejo que tapa la cédula — cambia el ángulo o aléjate de la luz directa."}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button type="button" variant={issue ? "default" : "outline"} onClick={retake} className="flex-1">
              <RotateCcw className="size-4" />
              Repetir
            </Button>
            <Button type="button" variant={issue ? "outline" : "default"} onClick={accept} className="flex-1">
              {issue ? "Usar de todos modos" : "Usar esta foto"}
            </Button>
          </div>
        </div>
      )}

      {state === "uploading" && <p className="text-center text-sm text-muted-foreground">Subiendo…</p>}

      {(state === "denied" || state === "unsupported") && (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              {state === "denied"
                ? "No pudimos acceder a tu cámara — puede que hayas rechazado el permiso, o que otra app la esté usando."
                : "Tu navegador no permite usar la cámara acá."}{" "}
              Puedes subir la foto como archivo en su lugar.
            </AlertDescription>
          </Alert>
          <Button type="button" variant="outline" onClick={onSwitchToFile} className="w-full">
            Subir archivo
          </Button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
