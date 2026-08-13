import { describe, expect, it } from "vite-plus/test";
import {
  arrangementOf,
  autoArrangement,
  cellRects,
  computeTopology,
  contentLength,
  dividerCentres,
  equalTracks,
  minTrackFraction,
  normalizeFractions,
  resizeTracks,
  slotSnapTargets,
  snapToNearest,
  syncTracks,
} from "./grid";

describe("computeTopology", () => {
  it("grows near square and fits 12 images exactly", () => {
    const shapes = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 12].map((n) => {
      const { rows, cols } = computeTopology(n);
      return `${cols}x${rows}`;
    });

    expect(shapes).toEqual([
      "1x1",
      "1x1",
      "2x1",
      "2x2",
      "2x2",
      "3x2",
      "3x2",
      "3x3",
      "3x3",
      "4x3",
      "4x3",
    ]);
  });

  it("never leaves fewer cells than images", () => {
    for (let n = 1; n <= 12; n++) {
      const { rows, cols } = computeTopology(n);
      expect(rows * cols).toBeGreaterThanOrEqual(n);
    }
  });
});

describe("autoArrangement", () => {
  it("puts leftover photos in the last row when stacking rows", () => {
    expect(autoArrangement(3, "rows")).toEqual([2, 1]);
    expect(autoArrangement(5, "rows")).toEqual([3, 2]);
    expect(autoArrangement(10, "rows")).toEqual([4, 4, 2]);
  });

  it("puts leftover photos in the last column when stacking columns", () => {
    expect(autoArrangement(3, "columns")).toEqual([2, 1]);
    expect(autoArrangement(5, "columns")).toEqual([2, 2, 1]);
    expect(autoArrangement(6, "columns")).toEqual([2, 2, 2]);
    expect(autoArrangement(10, "columns")).toEqual([3, 3, 3, 1]);
  });

  it("always holds every photo in either orientation", () => {
    for (let count = 1; count <= 12; count++) {
      for (const orientation of ["rows", "columns"] as const) {
        const bands = autoArrangement(count, orientation);
        expect(bands.reduce((sum, band) => sum + band, 0)).toBe(count);
      }
    }
  });
});

describe("equalTracks", () => {
  it("splits every band and every photo evenly", () => {
    expect(equalTracks([2, 1])).toEqual({ bands: [0.5, 0.5], slots: [[0.5, 0.5], [1]] });
  });

  it("describes the arrangement it was built from", () => {
    for (let count = 1; count <= 12; count++) {
      const arrangement = autoArrangement(count);
      expect(arrangementOf(equalTracks(arrangement))).toEqual(arrangement);
    }
  });
});

describe("syncTracks", () => {
  it("keeps custom sizes while the bands keep their shape", () => {
    const custom = { bands: [0.6, 0.4], slots: [[0.7, 0.3], [1]] };

    expect(syncTracks(custom, [2, 1])).toBe(custom);
  });

  it("resets to equal sizes once the bands change shape", () => {
    const custom = { bands: [0.6, 0.4], slots: [[0.7, 0.3], [1]] };

    expect(syncTracks(custom, [2, 2])).toEqual(equalTracks([2, 2]));
  });
});

describe("normalizeFractions", () => {
  it("rescales what is left so it fills the space again", () => {
    expect(normalizeFractions([0.25, 0.25])).toEqual([0.5, 0.5]);

    const [wide, narrow] = normalizeFractions([0.6, 0.2]);
    expect(wide).toBeCloseTo(0.75);
    expect(narrow).toBeCloseTo(0.25);
  });

  it("falls back to equal shares when everything is zero", () => {
    expect(normalizeFractions([0, 0])).toEqual([0.5, 0.5]);
  });
});

describe("resizeTracks", () => {
  it("keeps the total at 1 and moves size between neighbours", () => {
    const next = resizeTracks([0.5, 0.5], 0, 0.1);

    expect(next).toEqual([0.6, 0.4]);
    expect(next.reduce((sum, f) => sum + f, 0)).toBeCloseTo(1);
  });

  it("stops at the minimum track size in both directions", () => {
    const min = minTrackFraction(2);

    expect(resizeTracks([0.5, 0.5], 0, 5)[1]).toBeCloseTo(min);
    expect(resizeTracks([0.5, 0.5], 0, -5)[0]).toBeCloseTo(min);
  });

  it("ignores dividers that do not exist", () => {
    const fractions = [0.5, 0.5];

    expect(resizeTracks(fractions, 1, 0.1)).toBe(fractions);
  });
});

describe("cellRects", () => {
  const canvas = { width: 1080, height: 1080 };

  it("keeps a uniform gutter between cells and around the frame", () => {
    const rects = cellRects(canvas, 20, equalTracks([2, 2]), "rows");
    const [topLeft, topRight, bottomLeft] = rects;

    expect(rects).toHaveLength(4);
    expect(topLeft.x).toBe(20);
    expect(topLeft.y).toBe(20);
    expect(topRight.x - (topLeft.x + topLeft.width)).toBe(20);
    expect(bottomLeft.y - (topLeft.y + topLeft.height)).toBe(20);
    expect(canvas.width - (topRight.x + topRight.width)).toBe(20);
  });

  it("splits the content area according to the track fractions", () => {
    const rects = cellRects(canvas, 10, { bands: [1], slots: [[0.75, 0.25]] }, "rows");
    const [wide, narrow] = rects;
    const content = contentLength(canvas.width, 10, 2);

    expect(Math.abs(wide.width - content * 0.75)).toBeLessThanOrEqual(1);
    expect(Math.abs(narrow.width - content * 0.25)).toBeLessThanOrEqual(1);
    expect(Math.abs(wide.width + narrow.width - content)).toBeLessThanOrEqual(1);
    expect(wide.height).toBe(canvas.height - 20);
  });

  it("degrades to zero sized cells rather than negative ones", () => {
    const rects = cellRects({ width: 100, height: 100 }, 200, equalTracks([2]), "rows");

    for (const rect of rects) {
      expect(rect.width).toBeGreaterThanOrEqual(0);
      expect(rect.height).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives every row the full width, whatever it holds", () => {
    const rects = cellRects(canvas, 20, equalTracks([2, 1]), "rows");
    const [topLeft, topRight, bottom] = rects;

    expect(rects).toHaveLength(3);
    expect(bottom.x).toBe(topLeft.x);
    expect(bottom.x + bottom.width).toBe(topRight.x + topRight.width);
    expect(bottom.y).toBe(topLeft.y + topLeft.height + 20);
  });

  it("splits a shorter row evenly across the full width", () => {
    const rects = cellRects(canvas, 20, equalTracks([3, 2]), "rows");
    const topRow = rects.slice(0, 3);
    const bottomRow = rects.slice(3);

    expect(bottomRow[0].x).toBe(topRow[0].x);
    expect(bottomRow[1].x + bottomRow[1].width).toBe(topRow[2].x + topRow[2].width);
    expect(Math.abs(bottomRow[0].width - bottomRow[1].width)).toBeLessThanOrEqual(1);
    expect(bottomRow[1].x - (bottomRow[0].x + bottomRow[0].width)).toBe(20);
  });

  it("gives every column the full height when laid out in columns", () => {
    const rects = cellRects(canvas, 20, equalTracks([2, 1]), "columns");
    const [topLeft, bottomLeft, right] = rects;

    expect(rects).toHaveLength(3);
    expect(right.y).toBe(topLeft.y);
    expect(right.y + right.height).toBe(bottomLeft.y + bottomLeft.height);
    expect(right.x).toBe(topLeft.x + topLeft.width + 20);
    expect(bottomLeft.y).toBe(topLeft.y + topLeft.height + 20);
  });

  it("turns the same tracks on their side, swapping each rect", () => {
    const square = { width: 1000, height: 1000 };
    const tracks = equalTracks([3, 2]);
    const rows = cellRects(square, 20, tracks, "rows");
    const columns = cellRects(square, 20, tracks, "columns");

    expect(
      columns.map((rect) => ({ x: rect.y, y: rect.x, width: rect.height, height: rect.width })),
    ).toEqual(rows);
  });

  it("returns one rect per photo for every arrangement it can produce", () => {
    for (let count = 1; count <= 12; count++) {
      const tracks = equalTracks(autoArrangement(count));
      expect(cellRects(canvas, 16, tracks, "rows")).toHaveLength(count);
      expect(cellRects(canvas, 16, tracks, "columns")).toHaveLength(count);
    }
  });
});

describe("dividerCentres", () => {
  it("sits in the middle of each inner gutter", () => {
    const centres = dividerCentres(1000, 20, [0.5, 0.5]);
    const content = contentLength(1000, 20, 2);

    expect(centres).toEqual([20 + content / 2 + 10]);
  });

  it("has one fewer entry than tracks", () => {
    expect(dividerCentres(1000, 10, [0.25, 0.25, 0.5])).toHaveLength(2);
    expect(dividerCentres(1000, 10, [1])).toHaveLength(0);
  });
});

describe("snapToNearest", () => {
  it("pulls a value onto a nearby target", () => {
    expect(snapToNearest(103, [50, 100, 200], 8)).toBe(100);
  });

  it("leaves the value alone when nothing is close enough", () => {
    expect(snapToNearest(130, [50, 100, 200], 8)).toBe(130);
  });

  it("picks the closest target when several are in range", () => {
    expect(snapToNearest(103, [100, 108], 8)).toBe(100);
  });
});

describe("slotSnapTargets", () => {
  it("lists divider centres from every band except the one being dragged", () => {
    const slots = [
      [0.5, 0.5],
      [0.3, 0.7],
      [0.4, 0.6],
    ];
    const other = [...dividerCentres(1000, 20, slots[1]!), ...dividerCentres(1000, 20, slots[2]!)];

    expect(slotSnapTargets(1000, 20, slots, 0)).toEqual(other);
    expect(slotSnapTargets(1000, 20, slots, 1)).not.toContainEqual(
      dividerCentres(1000, 20, slots[1]!)[0],
    );
  });
});
