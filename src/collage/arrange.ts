import { autoArrangement, emptyCell, equalTracks, normalizeFractions, syncTracks } from "./grid";
import type { Cell, Orientation, Tracks } from "./types";

/** Cells in stacking order together with the tracks that shape them into bands. */
export type Layout = {
  cells: Cell[];
  tracks: Tracks;
};

/**
 * Where a dragged photo lands relative to the photo it was dropped on: beside it in the
 * same band, or in a band of its own on either side of that band.
 */
export type Placement = "swap" | "before" | "after" | "bandBefore" | "bandAfter";

export type Position = {
  band: number;
  slot: number;
};

type Slot = { cell: Cell; size: number };
type Band = { size: number; slots: Slot[] };

export function emptyLayout(): Layout {
  return { cells: [emptyCell()], tracks: equalTracks([1]) };
}

function toBands(layout: Layout): Band[] {
  let index = 0;
  return layout.tracks.bands.map((size, band) => ({
    size,
    slots: (layout.tracks.slots[band] ?? []).flatMap((slot) => {
      const cell = layout.cells[index++];
      return cell ? [{ cell, size: slot }] : [];
    }),
  }));
}

/** Rebuilds a layout from bands, dropping empty ones and rescaling what is left. */
function fromBands(bands: Band[]): Layout {
  const kept = bands.filter((band) => band.slots.length > 0);
  if (kept.length === 0) return emptyLayout();

  return {
    cells: kept.flatMap((band) => band.slots.map((slot) => slot.cell)),
    tracks: {
      bands: normalizeFractions(kept.map((band) => band.size)),
      slots: kept.map((band) => normalizeFractions(band.slots.map((slot) => slot.size))),
    },
  };
}

export function positionOf(tracks: Tracks, index: number): Position | null {
  let remaining = index;
  for (const [band, slots] of tracks.slots.entries()) {
    if (remaining < slots.length) return { band, slot: remaining };
    remaining -= slots.length;
  }
  return null;
}

/** Share a photo takes when it joins a band, or a band when it joins the collage. */
function newShare(count: number): number {
  return 1 / Math.max(1, count);
}

/** Lays the photos out as a near square grid for the current orientation. */
export function autoLayout(cells: Cell[], tracks: Tracks, orientation: Orientation): Layout {
  return {
    cells,
    tracks: syncTracks(tracks, autoArrangement(cells.length, orientation)),
  };
}

export function isEmpty(layout: Layout): boolean {
  return layout.cells.length === 1 && layout.cells[0]?.imageId === null;
}

/** Adds a photo to the last band, which then re-splits to make room for it. */
export function appendCell(layout: Layout, cell: Cell): Layout {
  const bands = toBands(layout);
  const last = bands[bands.length - 1];
  if (!last || isEmpty(layout)) return { cells: [cell], tracks: equalTracks([1]) };

  last.slots.push({ cell, size: newShare(last.slots.length) });
  return fromBands(bands);
}

/**
 * Takes a photo out of its band. The rest of that band grows into the space, so photos
 * never jump across from the next one.
 */
export function removeCell(layout: Layout, index: number): Layout {
  const at = positionOf(layout.tracks, index);
  if (!at) return layout;

  const bands = toBands(layout);
  bands[at.band]?.slots.splice(at.slot, 1);
  return fromBands(bands);
}

/**
 * Moves a photo next to another one, or into a band of its own beside that photo's
 * band. The band it came from closes the gap.
 */
export function moveCell(layout: Layout, from: number, to: number, placement: Placement): Layout {
  if (from === to) return layout;

  const source = positionOf(layout.tracks, from);
  const target = positionOf(layout.tracks, to);
  if (!source || !target) return layout;

  if (placement === "swap") {
    const a = layout.cells[from];
    const b = layout.cells[to];
    return a && b ? { ...layout, cells: layout.cells.with(from, b).with(to, a) } : layout;
  }

  const bands = toBands(layout);
  const anchor = bands[target.band]?.slots[target.slot];
  const moved = bands[source.band]?.slots.splice(source.slot, 1)[0];
  if (!anchor || !moved) return layout;

  if (placement === "bandBefore" || placement === "bandAfter") {
    const band = bands.findIndex((candidate) => candidate.slots.includes(anchor));
    const at = placement === "bandBefore" ? band : band + 1;
    bands.splice(at, 0, { size: newShare(bands.length), slots: [{ ...moved, size: 1 }] });
  } else {
    const band = bands.find((candidate) => candidate.slots.includes(anchor));
    if (!band) return layout;

    // Shuffling photos inside one band only reorders them, so they keep their sizes.
    const size = source.band === target.band ? moved.size : newShare(band.slots.length);
    const at = band.slots.indexOf(anchor) + (placement === "before" ? 0 : 1);
    band.slots.splice(at, 0, { ...moved, size });
  }

  return fromBands(bands);
}
