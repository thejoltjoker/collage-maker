import { Flex, Heading, HStack, Link, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { LuExternalLink } from "react-icons/lu";
import { setZoom } from "@/collage/crop";
import { exportCollage } from "@/collage/exportCollage";
import { cellRects, MAX_IMAGES } from "@/collage/grid";
import type { InstructionContext } from "@/collage/instructions";
import { orientedSize } from "@/collage/transform";
import type { ExportFormat } from "@/collage/types";
import { useCollage } from "@/collage/useCollage";
import { CanvasInstructions } from "@/components/collage/CanvasInstructions";
import { CollageCanvas } from "@/components/collage/CollageCanvas";
import { SelectionActionBar } from "@/components/collage/SelectionActionBar";
import { SidebarControls } from "@/components/collage/SidebarControls";
import { ColorModeButton } from "@/components/ui/color-mode";
import { toaster, Toaster } from "@/components/ui/toaster";

const ISSUE_URL = "https://github.com/thejoltjoker/collage-maker/issues/new";

const idleInstructions: InstructionContext = {
  hasSelection: false,
  resizingGutter: false,
  canSnapGutter: false,
  reordering: false,
  droppingFiles: false,
};

function App() {
  const collage = useCollage();
  const { state } = collage;
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [exporting, setExporting] = useState(false);
  const [instructions, setInstructions] = useState<InstructionContext>(idleInstructions);

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
    const oriented = orientedSize(selectedImage, selectedCell.transform.rotation);
    collage.setCrop(state.selectedIndex, setZoom(oriented, rect, selectedCell.crop, zoom));
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
        alignSelf="stretch"
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
          onReplaceSelected={(files) => {
            if (state.selectedIndex !== null) void addFiles(files, state.selectedIndex);
          }}
          onRemoveSelected={() => {
            if (state.selectedIndex !== null) collage.remove(state.selectedIndex);
          }}
          onFormatChange={setExportFormat}
          onExport={() => void handleExport()}
        />

        <Link
          href={ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          mt="auto"
          pt={2}
          fontSize="xs"
          color="fg.muted"
          display="inline-flex"
          alignItems="center"
          gap={1}
          _hover={{ color: "fg" }}
        >
          Request a feature or report a bug
          <LuExternalLink />
        </Link>
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
          onInstructionContextChange={setInstructions}
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
          <CanvasInstructions {...instructions} />
        </HStack>
      </Flex>

      <SelectionActionBar
        open={selectedImage != null}
        imageName={selectedImage?.name ?? null}
        onClose={() => collage.select(null)}
        onFlipHorizontal={() => {
          if (state.selectedIndex !== null) collage.flipHorizontal(state.selectedIndex);
        }}
        onFlipVertical={() => {
          if (state.selectedIndex !== null) collage.flipVertical(state.selectedIndex);
        }}
        onRotateClockwise={() => {
          if (state.selectedIndex !== null) collage.rotateClockwise(state.selectedIndex);
        }}
      />

      <Toaster />
    </Flex>
  );
}

export default App;
