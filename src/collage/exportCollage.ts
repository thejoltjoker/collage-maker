import { sourceRect } from "./crop";
import { cellRects } from "./grid";
import type { CanvasSpec, Cell, CollageImage, ExportFormat, Orientation, Tracks } from "./types";

export const JPEG_QUALITY = 0.92;

const MIME_TYPES: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
};

const EXTENSIONS: Record<ExportFormat, string> = {
  png: "png",
  jpeg: "jpg",
};

export type CollageDocument = {
  canvas: CanvasSpec;
  gutter: number;
  gutterColor: string;
  cells: Cell[];
  tracks: Tracks;
  orientation: Orientation;
  images: Record<string, CollageImage>;
};

/** Draws the collage at its full pixel size, sampling each image at its native resolution. */
export function renderCollage(collage: CollageDocument): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = collage.canvas.width;
  canvas.height = collage.canvas.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser did not provide a 2D canvas context.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = collage.gutterColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const rects = cellRects(collage.canvas, collage.gutter, collage.tracks, collage.orientation);
  collage.cells.forEach((cell, index) => {
    const rect = rects[index];
    const image = cell.imageId === null ? undefined : collage.images[cell.imageId];
    if (!image || !rect || rect.width <= 0 || rect.height <= 0) return;

    const source = sourceRect(image, rect, cell.crop);
    context.drawImage(
      image.element,
      source.x,
      source.y,
      source.width,
      source.height,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
    );
  });

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, format: ExportFormat): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding the collage failed."))),
      MIME_TYPES[format],
      format === "jpeg" ? JPEG_QUALITY : undefined,
    );
  });
}

export function collageFileName(canvas: CanvasSpec, format: ExportFormat): string {
  return `collage-${canvas.width}x${canvas.height}.${EXTENSIONS[format]}`;
}

export async function exportCollage(collage: CollageDocument, format: ExportFormat): Promise<void> {
  const blob = await toBlob(renderCollage(collage), format);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = collageFileName(collage.canvas, format);
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
