import { Box } from "@chakra-ui/react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { snapToNearest } from "@/collage/grid";

const MIN_HIT_AREA = 12;
const SNAP_THRESHOLD = 12;

type GutterDividerProps = {
  axis: "vertical" | "horizontal";
  /** Centre of the gutter along the axis, in preview pixels. */
  centre: number;
  thickness: number;
  /** Extent across the other axis, so a divider only covers the cells it separates. */
  crossStart: number;
  crossLength: number;
  /** Other gutter centres to align with while Shift is held. */
  snapTargets?: number[];
  onResize: (deltaPx: number) => void;
  onActiveChange?: (active: boolean) => void;
};

/** Drag handle that shifts space between two neighbouring rows or columns. */
export function GutterDivider({
  axis,
  centre,
  thickness,
  crossStart,
  crossLength,
  snapTargets = [],
  onResize,
  onActiveChange,
}: GutterDividerProps) {
  const [active, setActive] = useState(false);
  const dragRef = useRef<{ startPointer: number; startCentre: number; applied: number } | null>(
    null,
  );
  const vertical = axis === "vertical";
  const hitArea = Math.max(MIN_HIT_AREA, thickness);

  function setDragging(next: boolean) {
    setActive(next);
    onActiveChange?.(next);
  }

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    dragRef.current = {
      startPointer: vertical ? event.clientX : event.clientY,
      startCentre: centre,
      applied: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const position = vertical ? event.clientX : event.clientY;
    let desired = drag.startCentre + (position - drag.startPointer);
    if (event.shiftKey && snapTargets.length > 0) {
      desired = snapToNearest(desired, snapTargets, SNAP_THRESHOLD);
    }

    const total = desired - drag.startCentre;
    const step = total - drag.applied;
    drag.applied = total;
    if (step !== 0) onResize(step);
  }

  function end(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <Box
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      position="absolute"
      zIndex={2}
      cursor={vertical ? "col-resize" : "row-resize"}
      touchAction="none"
      bg={active ? "blue.solid" : "transparent"}
      opacity={active ? 0.75 : 1}
      _hover={{ bg: "blue.solid", opacity: 0.5 }}
      transition="background-color 0.12s ease"
      style={
        vertical
          ? { left: centre - hitArea / 2, top: crossStart, width: hitArea, height: crossLength }
          : { top: centre - hitArea / 2, left: crossStart, height: hitArea, width: crossLength }
      }
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
