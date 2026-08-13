import { Box, Icon, IconButton, Image, Stack, Text } from "@chakra-ui/react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { LuImage, LuMove, LuX } from "react-icons/lu";
import { imageOffset, panCrop, renderedSize, setZoom } from "@/collage/crop";
import { DEFAULT_CROP } from "@/collage/grid";
import type { Cell, CollageImage, Crop, Rect } from "@/collage/types";
import { DropIndicator, type Indicator } from "./DropIndicator";

type CollageCellProps = {
  index: number;
  cell: Cell;
  image: CollageImage | undefined;
  rect: Rect;
  selected: boolean;
  dropTarget: boolean;
  reordering: boolean;
  /** Where a photo being dragged over this cell would land, if any. */
  dropIndicator: Indicator | null;
  onSelect: (index: number) => void;
  onCropChange: (index: number, crop: Crop) => void;
  onRemove: (index: number) => void;
  onReorderStart: (index: number, event: ReactPointerEvent) => void;
};

export function CollageCell({
  index,
  cell,
  image,
  rect,
  selected,
  dropTarget,
  reordering,
  dropIndicator,
  onSelect,
  onCropChange,
  onRemove,
  onReorderStart,
}: CollageCellProps) {
  const [panning, setPanning] = useState(false);
  const cropRef = useRef<Crop>(cell.crop);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const rendered = image ? renderedSize(image, rect, cell.crop.zoom) : null;
  const offset = image ? imageOffset(image, rect, cell.crop) : null;
  const highlighted = dropTarget || dropIndicator === "swap";

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    onSelect(index);
    if (!image || event.button !== 0) return;

    cropRef.current = cell.crop;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning(true);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointerRef.current;
    if (!previous || !image) return;

    pointerRef.current = { x: event.clientX, y: event.clientY };
    cropRef.current = panCrop(
      image,
      rect,
      cropRef.current,
      event.clientX - previous.x,
      event.clientY - previous.y,
    );
    onCropChange(index, cropRef.current);
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    pointerRef.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function resetZoom() {
    if (!image) return;
    onSelect(index);
    onCropChange(index, setZoom(image, rect, cell.crop, DEFAULT_CROP.zoom));
  }

  return (
    <Box
      data-cell-index={index}
      position="absolute"
      overflow="hidden"
      bg={image ? "transparent" : "bg.panel"}
      borderWidth={image ? 0 : "1px"}
      borderStyle="dashed"
      borderColor={highlighted ? "blue.solid" : "border.emphasized"}
      outlineWidth={selected || highlighted ? "2px" : 0}
      outlineStyle="solid"
      outlineColor={highlighted ? "blue.solid" : "blue.emphasized"}
      outlineOffset="-2px"
      opacity={reordering ? 0.4 : 1}
      cursor={image ? (panning ? "grabbing" : "grab") : "default"}
      touchAction="none"
      transition="opacity 0.12s ease"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDoubleClick={resetZoom}
      css={{ "&:hover [data-cell-control]": { opacity: 1 } }}
    >
      {image && rendered && offset ? (
        <Image
          src={image.src}
          alt={image.name}
          draggable={false}
          pointerEvents="none"
          position="absolute"
          maxW="none"
          style={{
            left: offset.x,
            top: offset.y,
            width: rendered.width,
            height: rendered.height,
          }}
        />
      ) : (
        <Stack align="center" justify="center" gap={1} h="full" color="fg.muted" px={2}>
          <Icon size="md" color={highlighted ? "blue.fg" : "fg.subtle"}>
            <LuImage />
          </Icon>
          <Text fontSize="xs" textAlign="center" lineClamp={1}>
            Drop image
          </Text>
        </Stack>
      )}

      {dropIndicator && <DropIndicator indicator={dropIndicator} />}

      {image && (
        <>
          <IconButton
            aria-label={`Move ${image.name} to another cell`}
            title="Drag onto another photo: its middle swaps, its edges move this photo there"
            data-cell-control
            size="xs"
            variant="solid"
            bg="black/60"
            color="white"
            _hover={{ bg: "black/80" }}
            position="absolute"
            top={1}
            left={1}
            cursor="grab"
            opacity={selected ? 1 : 0}
            transition="opacity 0.12s ease"
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect(index);
              onReorderStart(index, event);
            }}
          >
            <LuMove />
          </IconButton>

          <IconButton
            aria-label={`Remove ${image.name}`}
            data-cell-control
            size="xs"
            variant="solid"
            bg="black/60"
            color="white"
            _hover={{ bg: "red.solid" }}
            position="absolute"
            top={1}
            right={1}
            opacity={selected ? 1 : 0}
            transition="opacity 0.12s ease"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onRemove(index)}
          >
            <LuX />
          </IconButton>
        </>
      )}
    </Box>
  );
}
