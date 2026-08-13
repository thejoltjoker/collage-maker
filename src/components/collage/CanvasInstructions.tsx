import { HStack, Kbd, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import {
  type InstructionContext,
  type InstructionKind,
  instructionKind,
} from "@/collage/instructions";

type CanvasInstructionsProps = InstructionContext;

function Hint({ children }: { children: ReactNode }) {
  return (
    <Text lineClamp={1} display={{ base: "none", sm: "block" }}>
      {children}
    </Text>
  );
}

function content(kind: InstructionKind) {
  switch (kind) {
    case "idle":
      return (
        <Hint>
          Drop images onto the canvas · Drag a gutter to resize · Click a photo to edit it
        </Hint>
      );
    case "selected":
      return (
        <Hint>
          Drag or <Kbd size="sm">↑</Kbd>
          <Kbd size="sm">↓</Kbd>
          <Kbd size="sm">←</Kbd>
          <Kbd size="sm">→</Kbd> to reposition · <Kbd size="sm">Shift</Kbd> + arrows for 10px ·
          Scroll to zoom
        </Hint>
      );
    case "snapGutter":
      return (
        <Hint>
          Hold <Kbd size="sm">Shift</Kbd> to snap this gutter to others
        </Hint>
      );
    case "resizeGutter":
      return <Hint>Drag to resize neighbouring bands</Hint>;
    case "reordering":
      return <Hint>Drop on an edge to place beside · Drop in the middle to swap</Hint>;
    case "droppingFiles":
      return <Hint>Drop on a cell to place there · Drop elsewhere to add photos</Hint>;
  }
}

export function CanvasInstructions(context: CanvasInstructionsProps) {
  return (
    <HStack justify="end" minW={0} flex="1">
      {content(instructionKind(context))}
    </HStack>
  );
}
