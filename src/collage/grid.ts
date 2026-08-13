import type { CanvasSpec, Cell, Crop, Orientation, Rect, Tracks } from "./types";

export const MAX_IMAGES = 12;
export const MAX_EXPORT_EDGE = 4096;

export const DEFAULT_CROP: Crop = { focusX: 0.5, focusY: 0.5, zoom: 1 };

export function emptyCell(): Cell {
  return { imageId: null, crop: { ...DEFAULT_CROP } };
}

/** Near square grid: 1, 2, 2x2, 3x2, 3x3, 4x3. */
export function computeTopology(cellCount: number): { rows: number; cols: number } {
  const count = Math.max(1, cellCount);
  const cols = Math.ceil(Math.sqrt(count));
  return { rows: Math.ceil(count / cols), cols };
}

/** How many photos each band holds, in stacking order. */
export type Arrangement = number[];

/** Bands of a near square grid, with any leftover photos in the last one. */
export function autoArrangement(cellCount: number): Arrangement {
  const count = Math.max(1, cellCount);
  const { rows, cols } = computeTopology(count);
  return Array.from({ length: rows }, (_, band) => Math.min(cols, count - band * cols));
}

export function arrangementOf(tracks: Tracks): Arrangement {
  return tracks.slots.map((band) => band.length);
}

export function equalFractions(count: number): number[] {
  return Array.from({ length: count }, () => 1 / count);
}

/** Every band and every photo gets the same share of the canvas. */
export function equalTracks(arrangement: Arrangement): Tracks {
  return {
    bands: equalFractions(arrangement.length),
    slots: arrangement.map(equalFractions),
  };
}

function sameArrangement(a: Arrangement, b: Arrangement): boolean {
  return a.length === b.length && a.every((count, index) => count === b[index]);
}

/** Keeps custom sizes while the bands keep their shape, and resets them once it changes. */
export function syncTracks(tracks: Tracks, arrangement: Arrangement): Tracks {
  return sameArrangement(arrangementOf(tracks), arrangement) ? tracks : equalTracks(arrangement);
}

/** Rescales fractions so they sum to 1 again after one was added or taken away. */
export function normalizeFractions(fractions: number[]): number[] {
  const total = fractions.reduce((sum, fraction) => sum + fraction, 0);
  return total > 0
    ? fractions.map((fraction) => fraction / total)
    : equalFractions(fractions.length);
}

/** Smallest share of an axis a single track may take, so cells never collapse. */
export function minTrackFraction(trackCount: number): number {
  return Math.min(0.08, 0.5 / trackCount);
}

/**
 * Move the divider between `index` and `index + 1` by `deltaFraction`, keeping the
 * pair's combined size constant so the grid always fills the canvas.
 */
export function resizeTracks(fractions: number[], index: number, deltaFraction: number): number[] {
  const before = fractions[index];
  const after = fractions[index + 1];
  if (before === undefined || after === undefined) return fractions;

  const min = minTrackFraction(fractions.length);
  const delta = Math.min(Math.max(deltaFraction, min - before), after - min);
  return fractions.map((fraction, i) => {
    if (i === index) return before + delta;
    if (i === index + 1) return after - delta;
    return fraction;
  });
}

/** Space left for cells on one axis once the gutters and outer frame are removed. */
export function contentLength(total: number, gutter: number, trackCount: number): number {
  return Math.max(0, total - gutter * (trackCount + 1));
}

export type Edge = [start: number, end: number];

/** Start and end pixel of every track along one axis. */
export function trackEdges(total: number, gutter: number, fractions: number[]): Edge[] {
  const content = contentLength(total, gutter, fractions.length);
  const edges: Edge[] = [];
  let position = gutter;
  for (const fraction of fractions) {
    const end = position + content * fraction;
    edges.push([Math.round(position), Math.round(end)]);
    position = end + gutter;
  }
  return edges;
}

/** The axis a band is measured across: down the canvas for rows, across it for columns. */
export function stackLength(canvas: CanvasSpec, orientation: Orientation): number {
  return orientation === "rows" ? canvas.height : canvas.width;
}

/** The axis a band spreads its photos along. */
export function bandLength(canvas: CanvasSpec, orientation: Orientation): number {
  return orientation === "rows" ? canvas.width : canvas.height;
}

/** Pixel rect of every cell, band by band, for the given canvas size. */
export function cellRects(
  canvas: CanvasSpec,
  gutter: number,
  tracks: Tracks,
  orientation: Orientation,
): Rect[] {
  const stack = trackEdges(stackLength(canvas, orientation), gutter, tracks.bands);

  return stack.flatMap(([bandStart, bandEnd], band) =>
    trackEdges(bandLength(canvas, orientation), gutter, tracks.slots[band] ?? []).map(
      ([slotStart, slotEnd]) =>
        orientation === "rows"
          ? {
              x: slotStart,
              y: bandStart,
              width: slotEnd - slotStart,
              height: bandEnd - bandStart,
            }
          : {
              x: bandStart,
              y: slotStart,
              width: bandEnd - bandStart,
              height: slotEnd - slotStart,
            },
    ),
  );
}

/** Centre position of each inner divider along an axis, in pixels. */
export function dividerCentres(total: number, gutter: number, fractions: number[]): number[] {
  const edges = trackEdges(total, gutter, fractions);
  return edges.slice(0, -1).map(([, end]) => end + gutter / 2);
}

export function clampExportSize(value: number): number {
  return Math.min(MAX_EXPORT_EDGE, Math.max(1, Math.round(value)));
}
