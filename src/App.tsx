import { Flex, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { setZoom } from "@/collage/crop";
import { exportCollage } from "@/collage/exportCollage";
import { cellRects, MAX_IMAGES } from "@/collage/grid";
import type { ExportFormat } from "@/collage/types";
import { useCollage } from "@/collage/useCollage";
import { CollageCanvas } from "@/components/collage/CollageCanvas";
import { SidebarControls } from "@/components/collage/SidebarControls";
import { ColorModeButton } from "@/components/ui/color-mode";
import { toaster, Toaster } from "@/components/ui/toaster";

function App() {
  const collage = useCollage();
  const { state } = collage;
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [exporting, setExporting] = useState(false);

  const selectedCell = state.selectedIndex === null ? undefined : state.cells[state.selectedIndex];
  const selectedImage =
    selectedCell?.imageId == null ? undefined : state.images[selectedCell.imageId];

  async function addFiles(files: File[], targetIndex: number | null) {
    if (files.length === 0) {
      toaster.create({ title: "No supported image files in that drop", type: "error" });
      return;
    }

    const result = await collage.addFiles(files, targetIndex);
    if (result.overflow > 0) {
      toaster.create({
        title: `A collage holds up to ${MAX_IMAGES} images`,
        description: `${result.overflow} file${result.overflow === 1 ? "" : "s"} left out.`,
        type: "info",
      });
    }
    if (result.failed > 0) {
      toaster.create({
        title: `Could not read ${result.failed} file${result.failed === 1 ? "" : "s"}`,
        type: "error",
      });
    }
  }

  function changeZoom(zoom: number) {
    if (state.selectedIndex === null || !selectedCell || !selectedImage) return;

    const rect = cellRects(state.canvas, state.gutter, state.tracks, state.orientation)[
      state.selectedIndex
    ];
    if (!rect) return;
    collage.setCrop(state.selectedIndex, setZoom(selectedImage, rect, selectedCell.crop, zoom));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportCollage(
        {
          canvas: state.canvas,
          gutter: state.gutter,
          gutterColor: state.gutterColor,
          cells: state.cells,
          tracks: state.tracks,
          orientation: state.orientation,
          images: state.images,
        },
        exportFormat,
      );
    } catch (error) {
      toaster.create({
        title: "Export failed",
        description: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Flex
      flex="1"
      minH="0"
      maxH={{ md: "100dvh" }}
      w="full"
      direction={{ base: "column", md: "row" }}
      overflow={{ md: "hidden" }}
    >
      <Stack
        as="aside"
        w={{ base: "full", md: "320px" }}
        flexShrink={0}
        gap={6}
        p={5}
        bg="bg.panel"
        borderRightWidth={{ base: 0, md: "1px" }}
        borderBottomWidth={{ base: "1px", md: 0 }}
        borderColor="border"
        overflowY={{ md: "auto" }}
      >
        <HStack justify="space-between">
          <Heading size="md" letterSpacing="tight">
            Collage Maker
          </Heading>
          <ColorModeButton />
        </HStack>

        <SidebarControls
          canvas={state.canvas}
          sizeValue={state.sizeValue}
          orientation={state.orientation}
          gutter={state.gutter}
          maxGutter={collage.maxGutter}
          gutterColor={state.gutterColor}
          imageCount={collage.imageCount}
          selectedName={selectedImage?.name ?? null}
          selectedZoom={selectedImage ? (selectedCell?.crop.zoom ?? null) : null}
          exportFormat={exportFormat}
          exporting={exporting}
          onPickSize={collage.setSize}
          onCustomSize={collage.setCustomSize}
          onOrientationChange={collage.setOrientation}
          onRandomize={collage.randomize}
          onGutterChange={collage.setGutter}
          onGutterColorChange={collage.setGutterColor}
          onZoomChange={changeZoom}
          onAddFiles={(files) => void addFiles(files, null)}
          onRemoveSelected={() => {
            if (state.selectedIndex !== null) collage.remove(state.selectedIndex);
          }}
          onFormatChange={setExportFormat}
          onExport={() => void handleExport()}
        />
      </Stack>

      <Flex as="main" direction="column" flex="1" minW="0" minH={{ base: "70vh", md: "0" }}>
        <CollageCanvas
          canvas={state.canvas}
          gutter={state.gutter}
          gutterColor={state.gutterColor}
          cells={state.cells}
          tracks={state.tracks}
          orientation={state.orientation}
          images={state.images}
          selectedIndex={state.selectedIndex}
          onSelect={collage.select}
          onDropFiles={(files, targetIndex) => void addFiles(files, targetIndex)}
          onCropChange={collage.setCrop}
          onMove={collage.move}
          onResizeBand={collage.resizeBand}
          onResizeSlot={collage.resizeSlot}
          onRemove={collage.remove}
        />

        <HStack
          as="footer"
          justify="space-between"
          gap={4}
          px={5}
          py={3}
          borderTopWidth="1px"
          borderColor="border"
          bg="bg.panel"
          color="fg.muted"
          fontSize="xs"
        >
          <Text fontVariantNumeric="tabular-nums">
            {state.canvas.width} × {state.canvas.height} px · {collage.imageCount} of {MAX_IMAGES}{" "}
            images
          </Text>
          <Text lineClamp={1} display={{ base: "none", sm: "block" }}>
            Drag a photo to reposition · Scroll to zoom · Drag a gutter to resize · Hold Shift to
            snap gutters · Drag the move handle onto another photo's edge to rearrange
          </Text>
        </HStack>
      </Flex>

      <Toaster />
    </Flex>
  );
}

export default App;
