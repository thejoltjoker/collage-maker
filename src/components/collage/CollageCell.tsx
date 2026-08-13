import { Box, Icon, IconButton, Image, Stack, Text } from "@chakra-ui/react";
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { LuImage, LuMove, LuX } from "react-icons/lu";
import { panCrop, setZoom } from "@/collage/crop";
import { DEFAULT_CROP } from "@/collage/grid";
import { orientedSize, transformLayout } from "@/collage/transform";
import type { Cell, CollageImage, Crop, Rect } from "@/collage/types";
import { Tooltip } from "@/components/ui/tooltip";
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

  const layout = image ? transformLayout(image, rect, cell.crop, cell.transform) : null;
  const oriented = image ? orientedSize(image, cell.transform.rotation) : null;
  const highlighted = dropTarget || dropIndicator === "swap";
  const showOverflow = panning && layout !== null;

  const imageStyle = layout
    ? {
        left: layout.box.x + layout.box.width / 2,
        top: layout.box.y + layout.box.height / 2,
        width: layout.bitmap.width,
        height: layout.bitmap.height,
        transform: layout.cssTransform,
      }
    : undefined;

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    onSelect(index);
    if (!image || !oriented || event.button !== 0 || event.detail > 1) return;

    cropRef.current = cell.crop;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointerRef.current;
    if (!previous || !image || !oriented) return;

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    if (!panning && dx === 0 && dy === 0) return;

    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (!panning) setPanning(true);
    cropRef.current = panCrop(oriented, rect, cropRef.current, dx, dy);
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
    if (!image || !oriented) return;
    onSelect(index);
    onCropChange(index, setZoom(oriented, rect, cell.crop, DEFAULT_CROP.zoom));
  }

  return (
    <Box
      data-cell-index={index}
      position="absolute"
      overflow={showOverflow ? "visible" : "hidden"}
      zIndex={showOverflow ? 3 : undefined}
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
      userSelect="none"
      transition="opacity 0.12s ease"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDoubleClick={resetZoom}
      css={{ "&:hover [data-cell-control]": { opacity: 1 } }}
    >
      {image && layout && imageStyle ? (
        <>
          {showOverflow && (
            <Image
              src={image.src}
              alt=""
              aria-hidden
              draggable={false}
              pointerEvents="none"
              position="absolute"
              maxW="none"
              opacity={0.35}
              style={imageStyle}
            />
          )}
          <Box overflow="hidden" position="absolute" inset={0}>
            <Image
              src={image.src}
              alt={image.name}
              draggable={false}
              pointerEvents="none"
              position="absolute"
              maxW="none"
              style={imageStyle}
            />
          </Box>
        </>
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
          <Tooltip content="Drag the move handle onto another photo's edge to rearrange">
            <IconButton
              aria-label={`Move ${image.name} to another cell`}
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
          </Tooltip>

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
