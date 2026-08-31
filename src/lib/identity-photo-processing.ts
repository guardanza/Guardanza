// Evaluación de papeles, Etapa 3 — chequeo de calidad de la foto de
// identidad, real y no cosmético (spec sección 10: "antes de aceptar,
// detectar foco, reflejo y bordes. Sin eso → imágenes ilegibles →
// rechazos por mala calidad"). Bordes se cubre con el marco guía en
// vivo del componente de cámara, no acá — detección automática de
// contorno de tarjeta sería sobre-ingeniería para v1.
//
// Corre sobre una versión reducida de la imagen (downscaleForAnalysis) —
// no hace falta resolución completa para medir nitidez/reflejo, y
// recorrer una imagen grande píxel a píxel sería lento en un teléfono.

// Varianza del Laplaciano sobre escala de grises — la medida estándar
// de "qué tan bruscos son los cambios de intensidad" en una imagen: una
// foto borrosa tiene bordes suaves, poca varianza. El umbral es
// empírico para este caso de uso (tarjeta a distancia de foto de
// documento), no un valor de algún paper — se ajusta si en la práctica
// resulta muy estricto o muy laxo.
const BLUR_VARIANCE_THRESHOLD = 100;

// Reflejo: a diferencia del blur, esto es más directo de medir — si una
// porción del marco tiene píxeles "quemados" (los 3 canales muy cerca
// de blanco puro), hay un reflejo tapando la cédula.
const GLARE_CHANNEL_THRESHOLD = 245; // por canal, sobre 255
const GLARE_PIXEL_RATIO_THRESHOLD = 0.06; // 6% del área analizada

// Techo para lo que efectivamente se sube — aplica a los dos caminos
// (cámara en vivo y archivo). Sin este tope, la cámara en vivo subía
// la foto a la resolución nativa que entregara el hardware: el "ideal"
// de getUserMedia no es una garantía, y un celular real fácilmente
// entrega mucho más que eso — encontrado en un Android real, donde la
// subida se quedaba pegada en "Subiendo…" sin ningún error (probable
// archivo de varios MB en una red móvil, nunca llegaba a fallar ni a
// terminar). 1600px sigue siendo de sobra para que se lea una cédula.
const MAX_UPLOAD_DIMENSION = 1600;

export interface PhotoQualityResult {
  ok: boolean;
  blurry: boolean;
  glare: boolean;
}

export function assessPhotoQuality(imageData: ImageData): PhotoQualityResult {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  let overexposedCount = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminancia perceptual (ITU-R BT.601) — no un promedio simple, así
    // el umbral de nitidez no depende del balance de color de la cámara.
    gray[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    if (r > GLARE_CHANNEL_THRESHOLD && g > GLARE_CHANNEL_THRESHOLD && b > GLARE_CHANNEL_THRESHOLD) {
      overexposedCount++;
    }
  }

  // Laplaciano discreto (kernel de 4 vecinos) — alcanza para distinguir
  // nítido de borroso acá, no hace falta el kernel 3x3 completo.
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = 4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - width] - gray[idx + width];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = n > 0 ? sum / n : 0;
  const variance = n > 0 ? sumSq / n - mean * mean : 0;
  const glareRatio = overexposedCount / (width * height);

  const blurry = variance < BLUR_VARIANCE_THRESHOLD;
  const glare = glareRatio > GLARE_PIXEL_RATIO_THRESHOLD;
  return { ok: !blurry && !glare, blurry, glare };
}

export function downscaleForAnalysis(source: HTMLCanvasElement, maxDim = 480): ImageData {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// La imagen que sí se sube: comprimida a webp, SIN recorte cuadrado (a
// diferencia de processAvatarImage, que sí recorta — una cédula es
// rectangular, recortarla a cuadrado perdería información real).
export function canvasToUploadBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))), "image/webp", quality);
  });
}

// Devuelve el mismo canvas si ya entra en maxDim, o una copia reducida
// si no — nunca agranda. Usado antes de canvasToUploadBlob en los dos
// caminos (cámara y archivo), para que lo que efectivamente se sube
// nunca dependa de la resolución nativa de la cámara o del archivo
// original.
export function clampCanvasDimensions(source: HTMLCanvasElement, maxDim = MAX_UPLOAD_DIMENSION): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(source.width, source.height));
  if (scale === 1) return source;
  const clamped = document.createElement("canvas");
  clamped.width = Math.max(1, Math.round(source.width * scale));
  clamped.height = Math.max(1, Math.round(source.height * scale));
  const ctx = clamped.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(source, 0, 0, clamped.width, clamped.height);
  return clamped;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Camino de archivo (drag-drop / selector de sistema) — no pasa por la
// cámara en vivo, pero corre el mismo chequeo de calidad sobre el
// archivo elegido antes de subirlo, con el mismo criterio "no
// cosmético" que el camino de cámara.
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("La imagen no puede pesar más de 8MB.");
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return clampCanvasDimensions(canvas);
}
