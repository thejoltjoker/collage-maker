import type { Crop, Rect, Size } from "./types";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Scale at which the image exactly covers the cell. */
export function coverScale(image: Size, cell: Size): number {
  if (image.width <= 0 || image.height <= 0) return 1;
  return Math.max(cell.width / image.width, cell.height / image.height);
}

export function renderedSize(image: Size, cell: Size, zoom: number): Size {
  const scale = coverScale(image, cell) * zoom;
  return { width: image.width * scale, height: image.height * scale };
}

/**
 * A focus value is only valid while it keeps the image over the whole cell. At the
 * cover scale the valid range collapses on the axis that already fits exactly.
 */
function focusRange(cellLength: number, renderedLength: number): [number, number] {
  const half = renderedLength > 0 ? cellLength / (2 * renderedLength) : 0.5;
  if (half >= 0.5) return [0.5, 0.5];
  return [half, 1 - half];
}

export function clampCrop(image: Size, cell: Size, crop: Crop): Crop {
  const zoom = clamp(crop.zoom, MIN_ZOOM, MAX_ZOOM);
  const rendered = renderedSize(image, cell, zoom);
  const [minX, maxX] = focusRange(cell.width, rendered.width);
  const [minY, maxY] = focusRange(cell.height, rendered.height);

  return {
    focusX: clamp(crop.focusX, minX, maxX),
    focusY: clamp(crop.focusY, minY, maxY),
    zoom,
  };
}

/** Top left of the rendered image relative to its cell. Always zero or negative. */
export function imageOffset(image: Size, cell: Size, crop: Crop): { x: number; y: number } {
  const rendered = renderedSize(image, cell, crop.zoom);
  return {
    x: cell.width / 2 - crop.focusX * rendered.width,
    y: cell.height / 2 - crop.focusY * rendered.height,
  };
}

/** Drag the image by a pixel delta measured in cell space. */
export function panCrop(image: Size, cell: Size, crop: Crop, dx: number, dy: number): Crop {
  const rendered = renderedSize(image, cell, crop.zoom);
  return clampCrop(image, cell, {
    focusX: crop.focusX - dx / rendered.width,
    focusY: crop.focusY - dy / rendered.height,
    zoom: crop.zoom,
  });
}

/** Zoom while keeping the image point under `pointer` (cell coordinates) in place. */
export function zoomCropAt(
  image: Size,
  cell: Size,
  crop: Crop,
  nextZoom: number,
  pointer: { x: number; y: number },
): Crop {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const current = renderedSize(image, cell, crop.zoom);
  const offset = imageOffset(image, cell, crop);
  const unitX = current.width > 0 ? (pointer.x - offset.x) / current.width : 0.5;
  const unitY = current.height > 0 ? (pointer.y - offset.y) / current.height : 0.5;

  const next = renderedSize(image, cell, zoom);
  return clampCrop(image, cell, {
    focusX: unitX + (cell.width / 2 - pointer.x) / next.width,
    focusY: unitY + (cell.height / 2 - pointer.y) / next.height,
    zoom,
  });
}

export function setZoom(image: Size, cell: Size, crop: Crop, nextZoom: number): Crop {
  return zoomCropAt(image, cell, crop, nextZoom, { x: cell.width / 2, y: cell.height / 2 });
}

/** Region of the source image drawn into the cell, for canvas `drawImage`. */
export function sourceRect(image: Size, cell: Size, crop: Crop): Rect {
  const scale = coverScale(image, cell) * crop.zoom;
  const offset = imageOffset(image, cell, crop);
  const width = Math.min(image.width, cell.width / scale);
  const height = Math.min(image.height, cell.height / scale);

  return {
    x: clamp(-offset.x / scale, 0, image.width - width),
    y: clamp(-offset.y / scale, 0, image.height - height),
    width,
    height,
  };
}
