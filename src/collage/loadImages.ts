import type { CollageImage } from "./types";

const SUPPORTED_TYPES = /^image\/(png|jpeg|webp|gif|avif)$/;

export function isSupportedImage(file: File): boolean {
  return SUPPORTED_TYPES.test(file.type);
}

export function imageFilesFrom(items: ArrayLike<File>): File[] {
  return Array.from(items).filter(isSupportedImage);
}

async function loadImageFile(file: File): Promise<CollageImage> {
  const src = URL.createObjectURL(file);
  const element = new Image();
  element.src = src;

  try {
    await element.decode();
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    src,
    width: element.naturalWidth,
    height: element.naturalHeight,
    element,
  };
}

/** Decodes every file it can, in the order they were given, and skips the ones it cannot. */
export async function loadImageFiles(files: File[]): Promise<CollageImage[]> {
  const results = await Promise.allSettled(files.map(loadImageFile));
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
