import { describe, expect, it } from "vite-plus/test";
import { type InstructionContext, instructionKind } from "./instructions";

const idle: InstructionContext = {
  hasSelection: false,
  resizingGutter: false,
  canSnapGutter: false,
  reordering: false,
  droppingFiles: false,
};

describe("instructionKind", () => {
  it("defaults to idle discoverability tips", () => {
    expect(instructionKind(idle)).toBe("idle");
  });

  it("shows photo tips when a photo is selected", () => {
    expect(instructionKind({ ...idle, hasSelection: true })).toBe("selected");
  });

  it("shows snap tip only while a snappable gutter is being dragged", () => {
    expect(
      instructionKind({ ...idle, hasSelection: true, resizingGutter: true, canSnapGutter: true }),
    ).toBe("snapGutter");
  });

  it("shows a plain resize tip when the gutter cannot snap", () => {
    expect(instructionKind({ ...idle, resizingGutter: true, canSnapGutter: false })).toBe(
      "resizeGutter",
    );
  });

  it("prefers reordering over selection", () => {
    expect(instructionKind({ ...idle, hasSelection: true, reordering: true })).toBe("reordering");
  });

  it("prefers file drops over everything else", () => {
    expect(
      instructionKind({
        ...idle,
        hasSelection: true,
        resizingGutter: true,
        canSnapGutter: true,
        reordering: true,
        droppingFiles: true,
      }),
    ).toBe("droppingFiles");
  });
});
