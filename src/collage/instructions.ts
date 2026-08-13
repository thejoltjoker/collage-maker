/** What the footer should explain based on the current canvas interaction. */
export type InstructionKind =
  | "idle"
  | "selected"
  | "snapGutter"
  | "resizeGutter"
  | "reordering"
  | "droppingFiles";

export type InstructionContext = {
  /** A filled photo is selected. */
  hasSelection: boolean;
  /** User is dragging a gutter divider. */
  resizingGutter: boolean;
  /** That gutter can align with others while Shift is held. */
  canSnapGutter: boolean;
  /** User is dragging the move handle between cells. */
  reordering: boolean;
  /** Files are being dragged over the stage. */
  droppingFiles: boolean;
};

/** Pick one tip — active gestures beat selection, which beats the idle discoverability copy. */
export function instructionKind(context: InstructionContext): InstructionKind {
  if (context.droppingFiles) return "droppingFiles";
  if (context.reordering) return "reordering";
  if (context.resizingGutter) return context.canSnapGutter ? "snapGutter" : "resizeGutter";
  if (context.hasSelection) return "selected";
  return "idle";
}
