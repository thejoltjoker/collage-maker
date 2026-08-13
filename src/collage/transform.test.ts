import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_TRANSFORM,
  flipHorizontal,
  flipVertical,
  orientedSize,
  rotateClockwise,
  transformLayout,
} from "./transform";

describe("orientedSize", () => {
  const landscape = { width: 4000, height: 2000 };

  it("keeps axes for 0 and 180", () => {
    expect(orientedSize(landscape, 0)).toEqual(landscape);
    expect(orientedSize(landscape, 180)).toEqual(landscape);
  });

  it("swaps axes for 90 and 270", () => {
    expect(orientedSize(landscape, 90)).toEqual({ width: 2000, height: 4000 });
    expect(orientedSize(landscape, 270)).toEqual({ width: 2000, height: 4000 });
  });
});

describe("flipHorizontal", () => {
  it("toggles flipX and mirrors focusX", () => {
    const crop = { focusX: 0.25, focusY: 0.4, zoom: 1.5 };
    const next = flipHorizontal(DEFAULT_TRANSFORM, crop);

    expect(next.transform.flipX).toBe(true);
    expect(next.crop.focusX).toBeCloseTo(0.75);
    expect(next.crop.focusY).toBe(0.4);
  });
});

describe("flipVertical", () => {
  it("toggles flipY and mirrors focusY", () => {
    const crop = { focusX: 0.25, focusY: 0.4, zoom: 1.5 };
    const next = flipVertical(DEFAULT_TRANSFORM, crop);

    expect(next.transform.flipY).toBe(true);
    expect(next.crop.focusY).toBeCloseTo(0.6);
    expect(next.crop.focusX).toBe(0.25);
  });
});

describe("rotateClockwise", () => {
  it("advances rotation by 90 degrees and wraps", () => {
    let transform = DEFAULT_TRANSFORM;
    let crop = { focusX: 0.25, focusY: 0.4, zoom: 2 };

    ({ transform, crop } = rotateClockwise(transform, crop));
    expect(transform.rotation).toBe(90);
    expect(crop.focusX).toBeCloseTo(0.4);
    expect(crop.focusY).toBeCloseTo(0.75);

    ({ transform } = rotateClockwise(transform, crop));
    expect(transform.rotation).toBe(180);

    ({ transform } = rotateClockwise(transform, crop));
    expect(transform.rotation).toBe(270);

    ({ transform } = rotateClockwise(transform, crop));
    expect(transform.rotation).toBe(0);
  });
});

describe("cssImageTransform", () => {
  it("lists rotate then flips for CSS application order", () => {
    const layout = transformLayout(
      { width: 4000, height: 2000 },
      { width: 600, height: 400 },
      { focusX: 0.5, focusY: 0.5, zoom: 1 },
      { flipX: true, flipY: true, rotation: 90 },
    );

    expect(layout.cssTransform).toContain("rotate(90deg)");
    expect(layout.cssTransform).toContain("scaleX(-1)");
    expect(layout.cssTransform).toContain("scaleY(-1)");
    expect(layout.bitmap.width).toBe(layout.box.height);
    expect(layout.bitmap.height).toBe(layout.box.width);
  });
});
