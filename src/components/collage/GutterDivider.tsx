import { Box } from "@chakra-ui/react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";

const MIN_HIT_AREA = 12;

type GutterDividerProps = {
  axis: "vertical" | "horizontal";
  /** Centre of the gutter along the axis, in preview pixels. */
  centre: number;
  thickness: number;
  /** Extent across the other axis, so a divider only covers the cells it separates. */
  crossStart: number;
  crossLength: number;
  onResize: (deltaPx: number) => void;
};

/** Drag handle that shifts space between two neighbouring rows or columns. */
export function GutterDivider({
  axis,
  centre,
  thickness,
  crossStart,
  crossLength,
  onResize,
}: GutterDividerProps) {
  const [active, setActive] = useState(false);
  const lastRef = useRef<number | null>(null);
  const vertical = axis === "vertical";
  const hitArea = Math.max(MIN_HIT_AREA, thickness);

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    lastRef.current = vertical ? event.clientX : event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(true);
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = lastRef.current;
    if (previous === null) return;

    const position = vertical ? event.clientX : event.clientY;
    lastRef.current = position;
    onResize(position - previous);
  }

  function end(event: ReactPointerEvent<HTMLDivElement>) {
    lastRef.current = null;
    setActive(false);
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
