const MAX_EDGE = 1600;
const TARGET_BYTES = 700 * 1024;
export const MAX_IMAGE_BYTES = 1024 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível preparar a foto.")),
    type, quality,
  ));
}

export async function prepareServiceOrderImage(original: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(original.type)) {
    throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  }
  if (original.size > 20 * 1024 * 1024) {
    throw new Error("A foto original deve ter no máximo 20 MB.");
  }

  const bitmap = await createImageBitmap(original);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto neste navegador.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const webpSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    const type = webpSupported ? "image/webp" : "image/jpeg";
    let best: Blob | null = null;
    for (const quality of [0.8, 0.68, 0.55, 0.42]) {
      const blob = await canvasBlob(canvas, type, quality);
      best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!best || best.size > MAX_IMAGE_BYTES) {
      throw new Error("A foto ainda ficou acima de 1 MB. Escolha outra imagem.");
    }
    return new File([best], `foto-os.${type === "image/webp" ? "webp" : "jpg"}`, { type });
  } finally {
    bitmap.close();
  }
}
