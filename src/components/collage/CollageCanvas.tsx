import { Box, Flex } from "@chakra-ui/react";
import {
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Placement } from "@/collage/arrange";
import { zoomCropAt } from "@/collage/crop";
import { bandLength, cellRects, contentLength, dividerCentres, trackEdges } from "@/collage/grid";
import { imageFilesFrom } from "@/collage/loadImages";
import type { CanvasSpec, Cell, CollageImage, Crop, Orientation, Tracks } from "@/collage/types";
import { useElementSize } from "@/collage/useElementSize";
import { CollageCell } from "./CollageCell";
import type { Edge } from "./DropIndicator";
import { GutterDivider } from "./GutterDivider";

const ZOOM_SENSITIVITY = 700;

/** Share of a cell along each edge that moves the photo instead of swapping it. */
const EDGE_ZONE = 0.3;

type CollageCanvasProps = {
  canvas: CanvasSpec;
  gutter: number;
  gutterColor: string;
  cells: Cell[];
  tracks: Tracks;
  orientation: Orientation;
  images: Record<string, CollageImage>;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onDropFiles: (files: File[], targetIndex: number | null) => void;
  onCropChange: (index: number, crop: Crop) => void;
  onMove: (from: number, to: number, placement: Placement) => void;
  onResizeBand: (index: number, deltaFraction: number) => void;
  onResizeSlot: (band: number, index: number, deltaFraction: number) => void;
  onRemove: (index: number) => void;
};

type DropTarget = {
  index: number;
  edge: Edge | null;
  placement: Placement;
};

function cellElementAt(target: EventTarget | Element | null): Element | null {
  return target instanceof Element ? target.closest("[data-cell-index]") : null;
}

function cellIndexAt(target: EventTarget | Element | null): number | null {
  const value = cellElementAt(target)?.getAttribute("data-cell-index");
  return value == null ? null : Number(value);
}

/** Edge of the cell the pointer is closest to, or null while it stays in the middle. */
function edgeAt(x: number, y: number, box: DOMRect): Edge | null {
  const left = (x - box.left) / box.width;
  const top = (y - box.top) / box.height;
  const toSide = Math.min(left, 1 - left);
  const toEnd = Math.min(top, 1 - top);

  if (toSide > EDGE_ZONE && toEnd > EDGE_ZONE) return null;
  if (toSide <= toEnd) return left < 0.5 ? "left" : "right";
  return top < 0.5 ? "top" : "bottom";
}

/**
 * The edges along a band place a photo beside its neighbour, the edges across the stack
 * give it a band of its own, and the middle swaps the two photos.
 */
function placementFor(edge: Edge | null, orientation: Orientation): Placement {
  if (edge === null) return "swap";

  const alongBand =
    orientation === "rows"
      ? edge === "left" || edge === "right"
      : edge === "top" || edge === "bottom";
  const first = edge === "left" || edge === "top";

  if (alongBand) return first ? "before" : "after";
  return first ? "bandBefore" : "bandAfter";
}

function dropTargetAt(x: number, y: number, orientation: Orientation): DropTarget | null {
  const element = cellElementAt(document.elementFromPoint(x, y));
  const index = cellIndexAt(element);
  if (element === null || index === null) return null;

  const edge = edgeAt(x, y, element.getBoundingClientRect());
  return { index, edge, placement: placementFor(edge, orientation) };
}

export function CollageCanvas({
  canvas,
  gutter,
  gutterColor,
  cells,
  tracks,
  orientation,
  images,
  selectedIndex,
  onSelect,
  onDropFiles,
  onCropChange,
  onMove,
  onResizeBand,
  onResizeSlot,
  onRemove,
}: CollageCanvasProps) {
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [fileDragging, setFileDragging] = useState(false);
  const [reorder, setReorder] = useState<{ from: number; over: DropTarget | null } | null>(null);

  const scale =
    stage.width > 0 && stage.height > 0
      ? Math.min(stage.width / canvas.width, stage.height / canvas.height)
      : 0;
  const frame = { width: canvas.width * scale, height: canvas.height * scale };
  const previewGutter = gutter * scale;
  const rects = cellRects(frame, previewGutter, tracks, orientation);
  const rows = orientation === "rows";
  const stackContent = contentLength(
    rows ? frame.height : frame.width,
    previewGutter,
    tracks.bands.length,
  );
  const bandSpans = trackEdges(rows ? frame.height : frame.width, previewGutter, tracks.bands);

  // Zooming has to preventDefault, which React's passive wheel listener cannot do.
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const index = cellIndexAt(event.target);
      if (index === null) return;

      const cell = cells[index];
      const rect = rects[index];
      const image = cell?.imageId == null ? undefined : images[cell.imageId];
      if (!cell || !rect || !image) return;

      event.preventDefault();
      const box = (event.target as Element).getBoundingClientRect();
      const factor = Math.exp(-event.deltaY / ZOOM_SENSITIVITY);
      onSelect(index);
      onCropChange(
        index,
        zoomCropAt(image, rect, cell.crop, cell.crop.zoom * factor, {
          x: event.clientX - box.left,
          y: event.clientY - box.top,
        }),
      );
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [cells, images, rects, onCropChange, onSelect]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (selectedIndex === null) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isTyping) return;

      event.preventDefault();
      onRemove(selectedIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, onRemove]);

  // Files dropped outside the stage would otherwise navigate away from the app.
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  function startReorder(from: number, event: ReactPointerEvent) {
    event.preventDefault();
    setReorder({ from, over: null });

    const track = (moveEvent: PointerEvent) => {
      const over = dropTargetAt(moveEvent.clientX, moveEvent.clientY, orientation);
      setReorder((current) => (current ? { ...current, over } : current));
    };

    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);

      const to = dropTargetAt(upEvent.clientX, upEvent.clientY, orientation);
      if (to && to.index !== from) onMove(from, to.index, to.placement);
      setReorder(null);
    };

    window.addEventListener("pointermove", track);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setFileDragging(true);
    setDropIndex(cellIndexAt(event.target));
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFileDragging(false);
    setDropIndex(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const targetIndex = cellIndexAt(event.target);
    setFileDragging(false);
    setDropIndex(null);
    onDropFiles(imageFilesFrom(event.dataTransfer.files), targetIndex);
  }

  return (
    <Flex
      ref={stageRef}
      flex="1"
      minH="0"
      minW="0"
      align="center"
      justify="center"
      p={{ base: 4, md: 8 }}
      bg="bg.muted"
      // Keeps the fixed size frame from growing the stage it is measured against.
      overflow="hidden"
      outlineWidth={fileDragging ? "2px" : 0}
      outlineStyle="solid"
      outlineColor="blue.solid"
      outlineOffset="-2px"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerDown={(event) => {
        if (cellIndexAt(event.target) === null) onSelect(null);
      }}
    >
      <Box
        ref={frameRef}
        position="relative"
        flexShrink={0}
        bg={gutterColor}
        shadow="lg"
        outlineWidth="1px"
        outlineStyle="solid"
        outlineColor="border"
        style={{ width: frame.width, height: frame.height }}
      >
        {scale > 0 &&
          cells.map((cell, index) => {
            const rect = rects[index];
            if (!rect) return null;

            return (
              <CollageCell
                key={index}
                index={index}
                cell={cell}
                image={cell.imageId == null ? undefined : images[cell.imageId]}
                rect={rect}
                selected={selectedIndex === index}
                dropTarget={dropIndex === index}
                reordering={reorder?.from === index}
                dropIndicator={
                  reorder && reorder.over?.index === index && reorder.from !== index
                    ? (reorder.over.edge ?? "swap")
                    : null
                }
                onSelect={onSelect}
                onCropChange={onCropChange}
                onRemove={onRemove}
                onReorderStart={startReorder}
              />
            );
          })}

        {scale > 0 &&
          tracks.slots.map((slots, band) => {
            const [start, end] = bandSpans[band] ?? [0, 0];
            const content = contentLength(
              bandLength(frame, orientation),
              previewGutter,
              slots.length,
            );

            return dividerCentres(bandLength(frame, orientation), previewGutter, slots).map(
              (centre, index) => (
                <GutterDivider
                  key={`slot-${band}-${index}`}
                  axis={rows ? "vertical" : "horizontal"}
                  centre={centre}
                  thickness={previewGutter}
                  crossStart={start}
                  crossLength={end - start}
                  onResize={(deltaPx) => onResizeSlot(band, index, deltaPx / content)}
                />
              ),
            );
          })}

        {scale > 0 &&
          dividerCentres(rows ? frame.height : frame.width, previewGutter, tracks.bands).map(
            (centre, index) => (
              <GutterDivider
                key={`band-${index}`}
                axis={rows ? "horizontal" : "vertical"}
                centre={centre}
                thickness={previewGutter}
                crossStart={0}
                crossLength={rows ? frame.width : frame.height}
                onResize={(deltaPx) => onResizeBand(index, deltaPx / stackContent)}
              />
            ),
          )}
      </Box>
    </Flex>
  );
}
