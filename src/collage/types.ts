import type { Transform } from "./transform";

export type Size = {
  width: number;
  height: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CollageImage = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  element: HTMLImageElement;
};

/**
 * Resolution independent crop. `focus` is the point of the image (0..1 on each
 * axis) aligned with the centre of its cell, `zoom` is a multiplier on top of
 * the scale that makes the image cover the cell, so the cell can never show a gap.
 */
export type Crop = {
  focusX: number;
  focusY: number;
  zoom: number;
};

export type Cell = {
  imageId: string | null;
  crop: Crop;
  transform: Transform;
};

/** Whether the collage stacks its bands of photos as rows or as columns. */
export type Orientation = "rows" | "columns";

/**
 * The collage is a stack of bands, each spanning the canvas and splitting itself among
 * its own photos. A band is a row of photos when the collage is laid out in rows and a
 * column of photos when it is laid out in columns.
 *
 * `bands` holds the size of each band across the stack and `slots[b]` the sizes inside
 * band `b`, all as fractions of the space left after gutters, so every list sums to 1.
 * The shape of `slots` therefore also says how many photos each band holds.
 */
export type Tracks = {
  bands: number[];
  slots: number[][];
};

export type CanvasSpec = Size;

export type ExportFormat = "png" | "jpeg";
