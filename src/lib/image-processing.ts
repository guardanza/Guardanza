const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TARGET_SIZE = 400;
const WEBP_QUALITY = 0.8;

// Center-crop to square + cap at 400x400 + WebP — all in the browser,
// before the file ever reaches a Server Action. Rejects anything over 5MB
// up front rather than processing it first and finding out too late.
export async function processAvatarImage(file: File): Promise<Blob> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("La imagen no puede pesar más de 5MB.");
  }

  const bitmap = await createImageBitmap(file);
  const cropSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - cropSize) / 2;
  const sy = (bitmap.height - cropSize) / 2;
  const targetSize = Math.min(TARGET_SIZE, cropSize);

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
  if (!blob) throw new Error("No se pudo procesar la imagen.");
  return blob;
}
