import { imageOffset, renderedSize } from "./crop";
import type { Crop, Size } from "./types";

/** Visual transform applied after crop focus/zoom, in image space then clockwise rotation. */
export type Transform = {
  flipX: boolean;
  flipY: boolean;
  /** Clockwise rotation in degrees. */
  rotation: 0 | 90 | 180 | 270;
};

export const DEFAULT_TRANSFORM: Transform = {
  flipX: false,
  flipY: false,
  rotation: 0,
};

/** Image size as it appears after rotation (90/270 swap axes). */
export function orientedSize(image: Size, rotation: Transform["rotation"]): Size {
  return rotation === 90 || rotation === 270
    ? { width: image.height, height: image.width }
    : { width: image.width, height: image.height };
}

export function flipHorizontal(
  transform: Transform,
  crop: Crop,
): { transform: Transform; crop: Crop } {
  return {
    transform: { ...transform, flipX: !transform.flipX },
    crop: { ...crop, focusX: 1 - crop.focusX },
  };
}

export function flipVertical(
  transform: Transform,
  crop: Crop,
): { transform: Transform; crop: Crop } {
  return {
    transform: { ...transform, flipY: !transform.flipY },
    crop: { ...crop, focusY: 1 - crop.focusY },
  };
}

/** Rotate 90° clockwise and keep the same subject under the cell centre. */
export function rotateClockwise(
  transform: Transform,
  crop: Crop,
): { transform: Transform; crop: Crop } {
  const rotation = ((transform.rotation + 90) % 360) as Transform["rotation"];
  return {
    transform: { ...transform, rotation },
    crop: {
      focusX: crop.focusY,
      focusY: 1 - crop.focusX,
      zoom: crop.zoom,
    },
  };
}

/**
 * Layout for painting a transformed image: an oriented box from crop math, plus the
 * unoriented bitmap size that CSS/canvas rotation turns into that box.
 */
export function transformLayout(
  image: Size,
  cell: Size,
  crop: Crop,
  transform: Transform,
): {
  box: { x: number; y: number; width: number; height: number };
  bitmap: Size;
  cssTransform: string;
} {
  const oriented = orientedSize(image, transform.rotation);
  const rendered = renderedSize(oriented, cell, crop.zoom);
  const offset = imageOffset(oriented, cell, crop);
  const quarter = transform.rotation === 90 || transform.rotation === 270;

  return {
    box: { x: offset.x, y: offset.y, width: rendered.width, height: rendered.height },
    bitmap: quarter
      ? { width: rendered.height, height: rendered.width }
      : { width: rendered.width, height: rendered.height },
    cssTransform: [
      "translate(-50%, -50%)",
      `rotate(${transform.rotation}deg)`,
      transform.flipX ? "scaleX(-1)" : null,
      transform.flipY ? "scaleY(-1)" : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
