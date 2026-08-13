import { describe, expect, it } from "vite-plus/test";
import {
  clampCrop,
  coverScale,
  imageOffset,
  MAX_ZOOM,
  panCrop,
  renderedSize,
  setZoom,
  sourceRect,
  zoomCropAt,
} from "./crop";
import type { Crop, Size } from "./types";

const landscape: Size = { width: 4000, height: 2000 };
const portrait: Size = { width: 2000, height: 4000 };
const cell: Size = { width: 600, height: 400 };
const centred: Crop = { focusX: 0.5, focusY: 0.5, zoom: 1 };

/** The cell is covered when the image starts at or before it and ends at or after it. */
function expectNoGap(image: Size, box: Size, crop: Crop) {
  const offset = imageOffset(image, box, crop);
  const rendered = renderedSize(image, box, crop.zoom);

  expect(offset.x).toBeLessThanOrEqual(1e-6);
  expect(offset.y).toBeLessThanOrEqual(1e-6);
  expect(offset.x + rendered.width).toBeGreaterThanOrEqual(box.width - 1e-6);
  expect(offset.y + rendered.height).toBeGreaterThanOrEqual(box.height - 1e-6);
}

describe("coverScale", () => {
  it("scales by the axis that would otherwise leave a gap", () => {
    expect(coverScale(landscape, cell)).toBeCloseTo(0.2);
    expect(coverScale(portrait, cell)).toBeCloseTo(0.3);
  });
});

describe("clampCrop", () => {
  it("pins the axis that already fits exactly", () => {
    const crop = clampCrop(landscape, cell, { focusX: 0.9, focusY: 0.1, zoom: 1 });

    expect(crop.focusY).toBeCloseTo(0.5);
    expectNoGap(landscape, cell, crop);
  });

  it("allows movement along the overflowing axis", () => {
    const crop = clampCrop(landscape, cell, { focusX: 0.4, focusY: 0.5, zoom: 1 });

    expect(crop.focusX).toBeCloseTo(0.4);
  });

  it("limits the overflowing axis to the range that still covers the cell", () => {
    const left = clampCrop(landscape, cell, { focusX: 0, focusY: 0.5, zoom: 1 });
    const right = clampCrop(landscape, cell, { focusX: 1, focusY: 0.5, zoom: 1 });

    expect(left.focusX).toBeCloseTo(0.375);
    expect(right.focusX).toBeCloseTo(0.625);
  });

  it("keeps zoom within bounds", () => {
    expect(clampCrop(landscape, cell, { ...centred, zoom: 0.2 }).zoom).toBe(1);
    expect(clampCrop(landscape, cell, { ...centred, zoom: 99 }).zoom).toBe(MAX_ZOOM);
  });
});

describe("panCrop", () => {
  it("moves the image with the pointer", () => {
    const crop = panCrop(landscape, cell, centred, -100, 0);

    expect(crop.focusX).toBeGreaterThan(0.5);
  });

  it("never pans a gap into view, however far it is dragged", () => {
    for (const [dx, dy] of [
      [9999, 9999],
      [-9999, -9999],
      [9999, -9999],
    ]) {
      const crop = panCrop(portrait, cell, { ...centred, zoom: 1.5 }, dx, dy);
      expectNoGap(portrait, cell, crop);
    }
  });
});

describe("zoomCropAt", () => {
  it("keeps the point under the pointer anchored", () => {
    const pointer = { x: 150, y: 300 };
    const start = clampCrop(portrait, cell, centred);
    const zoomed = zoomCropAt(portrait, cell, start, 2, pointer);

    const before = imageOffset(portrait, cell, start);
    const after = imageOffset(portrait, cell, zoomed);
    const unitBefore = (pointer.y - before.y) / renderedSize(portrait, cell, start.zoom).height;
    const unitAfter = (pointer.y - after.y) / renderedSize(portrait, cell, zoomed.zoom).height;

    expect(unitAfter).toBeCloseTo(unitBefore, 5);
  });

  it("still covers the cell when zooming out at an edge", () => {
    const panned = panCrop(landscape, cell, { ...centred, zoom: 3 }, 900, 900);
    const zoomed = zoomCropAt(landscape, cell, panned, 1, { x: 0, y: 0 });

    expectNoGap(landscape, cell, zoomed);
  });
});

describe("setZoom", () => {
  it("zooms around the centre of the cell", () => {
    const crop = setZoom(portrait, cell, clampCrop(portrait, cell, centred), 2);

    expect(crop.focusX).toBeCloseTo(0.5);
    expect(crop.focusY).toBeCloseTo(0.5);
  });
});

describe("sourceRect", () => {
  it("reads the full width of a matching aspect ratio", () => {
    const rect = sourceRect(landscape, { width: 800, height: 400 }, centred);

    expect(rect).toEqual({ x: 0, y: 0, width: 4000, height: 2000 });
  });

  it("crops the overflowing axis and stays inside the image", () => {
    const crop = clampCrop(landscape, cell, { focusX: 0.2, focusY: 0.5, zoom: 1 });
    const rect = sourceRect(landscape, cell, crop);

    expect(rect.height).toBeCloseTo(landscape.height);
    expect(rect.width).toBeLessThan(landscape.width);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(landscape.width + 1e-6);
  });

  it("shrinks the sampled region as zoom increases", () => {
    const base = sourceRect(portrait, cell, centred);
    const zoomed = sourceRect(portrait, cell, { ...centred, zoom: 2 });

    expect(zoomed.width).toBeCloseTo(base.width / 2);
    expect(zoomed.height).toBeCloseTo(base.height / 2);
  });
});
