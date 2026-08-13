import { describe, expect, it } from "vite-plus/test";
import {
  appendCell,
  autoLayout,
  emptyLayout,
  isEmpty,
  type Layout,
  moveCell,
  positionOf,
  removeCell,
} from "./arrange";
import { arrangementOf, autoArrangement, equalTracks } from "./grid";
import type { Cell } from "./types";

function cell(imageId: string): Cell {
  return { imageId, crop: { focusX: 0.5, focusY: 0.5, zoom: 1 } };
}

/** Builds a layout from bands of image ids, with every band and photo sharing evenly. */
function layoutOf(bands: string[][]): Layout {
  return {
    cells: bands.flat().map(cell),
    tracks: equalTracks(bands.map((band) => band.length)),
  };
}

function idBands(layout: Layout): string[][] {
  let index = 0;
  return layout.tracks.slots.map((band) => band.map(() => layout.cells[index++]?.imageId ?? "?"));
}

describe("positionOf", () => {
  it("maps a flat index onto its band and slot", () => {
    const tracks = equalTracks([2, 1, 3]);

    expect(positionOf(tracks, 0)).toEqual({ band: 0, slot: 0 });
    expect(positionOf(tracks, 2)).toEqual({ band: 1, slot: 0 });
    expect(positionOf(tracks, 4)).toEqual({ band: 2, slot: 1 });
    expect(positionOf(tracks, 6)).toBeNull();
  });
});

describe("autoLayout", () => {
  it("arranges photos as a near square grid for the given orientation", () => {
    const cells = ["a", "b", "c", "d", "e"].map(cell);

    expect(arrangementOf(autoLayout(cells, equalTracks([1]), "rows").tracks)).toEqual(
      autoArrangement(5, "rows"),
    );
    expect(arrangementOf(autoLayout(cells, equalTracks([1]), "columns").tracks)).toEqual(
      autoArrangement(5, "columns"),
    );
  });
});

describe("appendCell", () => {
  it("adds to the last band, which re-splits to make room", () => {
    const next = appendCell(layoutOf([["a", "b"], ["c"]]), cell("d"));

    expect(idBands(next)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(next.tracks.slots[1]).toEqual([0.5, 0.5]);
  });

  it("takes over the empty slot of a fresh collage", () => {
    const next = appendCell(emptyLayout(), cell("a"));

    expect(idBands(next)).toEqual([["a"]]);
    expect(isEmpty(next)).toBe(false);
  });
});

describe("removeCell", () => {
  it("lets the rest of the band fill the space instead of pulling photos across", () => {
    const next = removeCell(layoutOf([["a", "b", "c"], ["d"]]), 1);

    expect(idBands(next)).toEqual([["a", "c"], ["d"]]);
    expect(next.tracks.slots[0]).toEqual([0.5, 0.5]);
    expect(next.tracks.bands).toEqual([0.5, 0.5]);
  });

  it("keeps the sizes of the survivors in proportion", () => {
    const layout = {
      cells: ["a", "b", "c"].map(cell),
      tracks: { bands: [1], slots: [[0.5, 0.3, 0.2]] },
    };
    const next = removeCell(layout, 0);

    expect(next.tracks.slots[0][0]).toBeCloseTo(0.6);
    expect(next.tracks.slots[0][1]).toBeCloseTo(0.4);
  });

  it("drops a band once its last photo goes and shares out its size", () => {
    const next = removeCell(layoutOf([["a", "b"], ["c"]]), 2);

    expect(idBands(next)).toEqual([["a", "b"]]);
    expect(next.tracks.bands).toEqual([1]);
  });

  it("falls back to a single empty slot", () => {
    expect(isEmpty(removeCell(layoutOf([["a"]]), 0))).toBe(true);
  });
});

describe("moveCell", () => {
  it("splits two photos into their own bands", () => {
    const next = moveCell(layoutOf([["a", "b"]]), 1, 0, "bandAfter");

    expect(idBands(next)).toEqual([["a"], ["b"]]);
    expect(next.tracks.bands).toEqual([0.5, 0.5]);
  });

  it("puts a photo in a band before the one it was dropped on", () => {
    const next = moveCell(layoutOf([["a", "b"]]), 1, 0, "bandBefore");

    expect(idBands(next)).toEqual([["b"], ["a"]]);
  });

  it("moves a photo into another band beside its target", () => {
    const next = moveCell(layoutOf([["a", "b"], ["c"]]), 0, 2, "after");

    expect(idBands(next)).toEqual([["b"], ["c", "a"]]);
    expect(next.tracks.slots[1]).toEqual([0.5, 0.5]);
  });

  it("reorders within a band, carrying each photo's size along", () => {
    const layout = {
      cells: ["a", "b", "c"].map(cell),
      tracks: { bands: [1], slots: [[0.5, 0.3, 0.2]] },
    };
    const next = moveCell(layout, 2, 0, "before");

    expect(idBands(next)).toEqual([["c", "a", "b"]]);
    expect(next.tracks.slots[0]).toEqual([0.2, 0.5, 0.3]);
  });

  it("swaps two photos without touching the bands", () => {
    const layout = layoutOf([["a", "b"], ["c"]]);
    const next = moveCell(layout, 0, 2, "swap");

    expect(idBands(next)).toEqual([["c", "b"], ["a"]]);
    expect(next.tracks).toEqual(layout.tracks);
  });

  it("removes a band that the moved photo leaves empty", () => {
    const next = moveCell(layoutOf([["a", "b"], ["c"]]), 2, 0, "after");

    expect(idBands(next)).toEqual([["a", "c", "b"]]);
    expect(next.tracks.bands).toEqual([1]);
  });

  it("ignores a photo dropped on itself", () => {
    const layout = layoutOf([["a", "b"]]);

    expect(moveCell(layout, 1, 1, "bandAfter")).toBe(layout);
  });
});
