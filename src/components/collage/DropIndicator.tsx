import { Box, type BoxProps } from "@chakra-ui/react";

export type Edge = "left" | "right" | "top" | "bottom";

/** The edge a dragged photo would join, or a swap with the photo underneath. */
export type Indicator = Edge | "swap";

const BAR = "6px";

const EDGES: Record<Edge, BoxProps> = {
  left: { insetY: 1, left: 0, width: BAR },
  right: { insetY: 1, right: 0, width: BAR },
  top: { insetX: 1, top: 0, height: BAR },
  bottom: { insetX: 1, bottom: 0, height: BAR },
};

/** Shows where a dragged photo will land: a bar on the edge it joins, or a swap tint. */
export function DropIndicator({ indicator }: { indicator: Indicator }) {
  if (indicator === "swap") {
    return <Box position="absolute" inset={0} pointerEvents="none" bg="blue.solid/25" />;
  }

  return (
    <Box
      position="absolute"
      pointerEvents="none"
      bg="blue.solid"
      borderRadius="full"
      shadow="md"
      {...EDGES[indicator]}
    />
  );
}
