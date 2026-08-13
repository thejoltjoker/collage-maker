import { useEffect, useReducer, useRef } from "react";
import {
  appendCell,
  autoLayout,
  emptyLayout,
  type Layout,
  moveCell,
  type Placement,
  removeCell,
} from "./arrange";
import { clampCrop } from "./crop";
import {
  bandLength,
  cellRects,
  clampExportSize,
  DEFAULT_CROP,
  MAX_IMAGES,
  resizeTracks,
  stackLength,
} from "./grid";
import { loadImageFiles } from "./loadImages";
import { CUSTOM_SIZE_VALUE, defaultSizePreset, type SizePreset } from "./sizes";
import type { CanvasSpec, Cell, CollageImage, Crop, Orientation, Tracks } from "./types";

export const MIN_CELL_LENGTH = 8;
export const MAX_GUTTER = 120;

export type CollageState = {
  canvas: CanvasSpec;
  sizeValue: string;
  gutter: number;
  gutterColor: string;
  images: Record<string, CollageImage>;
  cells: Cell[];
  tracks: Tracks;
  orientation: Orientation;
  /** True while the bands still follow the near square default, false once rearranged. */
  autoArranged: boolean;
  selectedIndex: number | null;
};

type Action =
  | { type: "addImages"; images: CollageImage[]; targetIndex: number | null }
  | { type: "removeAt"; index: number }
  | { type: "move"; from: number; to: number; placement: Placement }
  | { type: "setCrop"; index: number; crop: Crop }
  | { type: "setOrientation"; orientation: Orientation }
  | { type: "resizeBand"; index: number; deltaFraction: number }
  | { type: "resizeSlot"; band: number; index: number; deltaFraction: number }
  | { type: "setSize"; preset: SizePreset }
  | { type: "setCustomSize"; width?: number; height?: number }
  | { type: "setGutter"; gutter: number }
  | { type: "setGutterColor"; color: string }
  | { type: "select"; index: number | null };

function createInitialState(): CollageState {
  return {
    canvas: { width: defaultSizePreset.width, height: defaultSizePreset.height },
    sizeValue: defaultSizePreset.value,
    gutter: 16,
    gutterColor: "#ffffff",
    images: {},
    ...emptyLayout(),
    orientation: "rows",
    autoArranged: true,
    selectedIndex: null,
  };
}

function filledCount(cells: Cell[]): number {
  return cells.reduce((count, cell) => (cell.imageId === null ? count : count + 1), 0);
}

/** Largest gutter that still leaves every cell visible, judged by the busiest band. */
function maxGutterFor(canvas: CanvasSpec, tracks: Tracks, orientation: Orientation): number {
  const limit = (total: number, trackCount: number) =>
    (total - MIN_CELL_LENGTH * trackCount) / (trackCount + 1);
  const fullestBand = Math.max(1, ...tracks.slots.map((band) => band.length));

  return Math.max(
    0,
    Math.min(
      MAX_GUTTER,
      limit(bandLength(canvas, orientation), fullestBand),
      limit(stackLength(canvas, orientation), tracks.bands.length),
    ),
  );
}

function pruneImages(
  images: Record<string, CollageImage>,
  cells: Cell[],
): Record<string, CollageImage> {
  const used = new Set(cells.flatMap((cell) => (cell.imageId === null ? [] : [cell.imageId])));
  const entries = Object.entries(images).filter(([id]) => used.has(id));
  return entries.length === Object.keys(images).length ? images : Object.fromEntries(entries);
}

function clampSelection(index: number | null, cells: Cell[]): number | null {
  if (index === null || index >= cells.length) return null;
  return index;
}

/** Single place that enforces "an image always covers its cell", whatever changed. */
function normalizeCrops(state: CollageState): CollageState {
  const rects = cellRects(state.canvas, state.gutter, state.tracks, state.orientation);
  let changed = false;

  const cells = state.cells.map((cell, index) => {
    const image = cell.imageId === null ? undefined : state.images[cell.imageId];
    const rect = rects[index];
    if (!image || !rect) return cell;

    const crop = clampCrop(image, rect, cell.crop);
    if (
      crop.focusX === cell.crop.focusX &&
      crop.focusY === cell.crop.focusY &&
      crop.zoom === cell.crop.zoom
    ) {
      return cell;
    }
    changed = true;
    return { ...cell, crop };
  });

  return changed ? { ...state, cells } : state;
}

function reduce(state: CollageState, action: Action): CollageState {
  switch (action.type) {
    case "addImages": {
      const images = { ...state.images };
      let layout: Layout = { cells: state.cells, tracks: state.tracks };
      let incoming = action.images;

      const target = action.targetIndex;
      if (target !== null && incoming.length > 0 && target < layout.cells.length) {
        const [first, ...rest] = incoming;
        images[first.id] = first;
        layout = {
          ...layout,
          cells: layout.cells.with(target, { imageId: first.id, crop: { ...DEFAULT_CROP } }),
        };
        incoming = rest;
      }

      const added: Cell[] = [];
      for (const image of incoming) {
        if (filledCount(layout.cells) + added.length >= MAX_IMAGES) break;
        images[image.id] = image;
        added.push({ imageId: image.id, crop: { ...DEFAULT_CROP } });
      }

      // Untouched collages keep re-flowing into a near square grid; rearranged ones
      // keep their bands and take the new photos into the last one.
      layout = state.autoArranged
        ? autoLayout(
            [...layout.cells.filter((cell) => cell.imageId !== null), ...added],
            state.tracks,
          )
        : added.reduce(appendCell, layout);

      return {
        ...state,
        ...layout,
        images: pruneImages(images, layout.cells),
        selectedIndex: clampSelection(state.selectedIndex, layout.cells),
      };
    }

    case "removeAt": {
      const cell = state.cells[action.index];
      if (!cell || cell.imageId === null) return state;

      const layout = removeCell(state, action.index);
      return {
        ...state,
        ...layout,
        // The band that lost a photo keeps its shape, so stop re-flowing from here on.
        autoArranged: false,
        images: pruneImages(state.images, layout.cells),
        selectedIndex: null,
      };
    }

    case "move": {
      const moved = state.cells[action.from];
      if (!moved || !state.cells[action.to] || action.from === action.to) return state;

      const layout = moveCell(state, action.from, action.to, action.placement);
      return {
        ...state,
        ...layout,
        autoArranged: false,
        selectedIndex: layout.cells.indexOf(moved),
      };
    }

    case "setCrop": {
      const cell = state.cells[action.index];
      if (!cell) return state;
      return { ...state, cells: state.cells.with(action.index, { ...cell, crop: action.crop }) };
    }

    // Bands and slots stay as they are, so the collage simply turns on its side.
    case "setOrientation": {
      if (action.orientation === state.orientation) return state;
      return {
        ...state,
        orientation: action.orientation,
        gutter: Math.min(
          state.gutter,
          maxGutterFor(state.canvas, state.tracks, action.orientation),
        ),
      };
    }

    case "resizeBand": {
      const bands = resizeTracks(state.tracks.bands, action.index, action.deltaFraction);
      return { ...state, tracks: { ...state.tracks, bands } };
    }

    case "resizeSlot": {
      const band = state.tracks.slots[action.band];
      if (!band) return state;

      const resized = resizeTracks(band, action.index, action.deltaFraction);
      return {
        ...state,
        tracks: { ...state.tracks, slots: state.tracks.slots.with(action.band, resized) },
      };
    }

    case "setSize": {
      const canvas = { width: action.preset.width, height: action.preset.height };
      return {
        ...state,
        canvas,
        sizeValue: action.preset.value,
        gutter: Math.min(state.gutter, maxGutterFor(canvas, state.tracks, state.orientation)),
      };
    }

    case "setCustomSize": {
      const canvas = {
        width: clampExportSize(action.width ?? state.canvas.width),
        height: clampExportSize(action.height ?? state.canvas.height),
      };
      return {
        ...state,
        canvas,
        sizeValue: CUSTOM_SIZE_VALUE,
        gutter: Math.min(state.gutter, maxGutterFor(canvas, state.tracks, state.orientation)),
      };
    }

    case "setGutter":
      return {
        ...state,
        gutter: Math.max(
          0,
          Math.min(action.gutter, maxGutterFor(state.canvas, state.tracks, state.orientation)),
        ),
      };

    case "setGutterColor":
      return { ...state, gutterColor: action.color };

    case "select":
      return { ...state, selectedIndex: clampSelection(action.index, state.cells) };
  }
}

function reducer(state: CollageState, action: Action): CollageState {
  return normalizeCrops(reduce(state, action));
}

export type AddImagesResult = {
  added: number;
  /** Files that could not be decoded. */
  failed: number;
  /** Files dropped because the collage is already full. */
  overflow: number;
};

export function useCollage() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const previousImages = useRef(state.images);
  useEffect(() => {
    const previous = previousImages.current;
    previousImages.current = state.images;
    for (const [id, image] of Object.entries(previous)) {
      if (!(id in state.images)) URL.revokeObjectURL(image.src);
    }
  }, [state.images]);

  const capacityFor = (targetIndex: number | null) => {
    const target = targetIndex === null ? undefined : state.cells[targetIndex];
    const replacing = target !== undefined && target.imageId !== null;
    return MAX_IMAGES - filledCount(state.cells) + (replacing ? 1 : 0);
  };

  return {
    state,
    imageCount: filledCount(state.cells),
    maxGutter: maxGutterFor(state.canvas, state.tracks, state.orientation),

    async addFiles(files: File[], targetIndex: number | null): Promise<AddImagesResult> {
      const accepted = files.slice(0, Math.max(0, capacityFor(targetIndex)));
      const images = await loadImageFiles(accepted);
      if (images.length > 0) dispatch({ type: "addImages", images, targetIndex });

      return {
        added: images.length,
        failed: accepted.length - images.length,
        overflow: files.length - accepted.length,
      };
    },

    remove: (index: number) => dispatch({ type: "removeAt", index }),
    move: (from: number, to: number, placement: Placement) =>
      dispatch({ type: "move", from, to, placement }),
    setCrop: (index: number, crop: Crop) => dispatch({ type: "setCrop", index, crop }),
    setOrientation: (orientation: Orientation) => dispatch({ type: "setOrientation", orientation }),
    resizeBand: (index: number, deltaFraction: number) =>
      dispatch({ type: "resizeBand", index, deltaFraction }),
    resizeSlot: (band: number, index: number, deltaFraction: number) =>
      dispatch({ type: "resizeSlot", band, index, deltaFraction }),
    setSize: (preset: SizePreset) => dispatch({ type: "setSize", preset }),
    setCustomSize: (size: { width?: number; height?: number }) =>
      dispatch({ type: "setCustomSize", ...size }),
    setGutter: (gutter: number) => dispatch({ type: "setGutter", gutter }),
    setGutterColor: (color: string) => dispatch({ type: "setGutterColor", color }),
    select: (index: number | null) => dispatch({ type: "select", index }),
  };
}
