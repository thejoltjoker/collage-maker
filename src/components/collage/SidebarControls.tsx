import {
  Button,
  ColorPicker,
  createListCollection,
  Field,
  HStack,
  NumberInput,
  parseColor,
  Portal,
  SegmentGroup,
  Select,
  Slider,
  Stack,
  Text,
} from "@chakra-ui/react";
import { type ReactNode, useRef } from "react";
import { LuColumns3, LuImagePlus, LuReplace, LuRows3, LuShuffle, LuTrash2 } from "react-icons/lu";
import { MAX_ZOOM, MIN_ZOOM } from "@/collage/crop";
import { MAX_EXPORT_EDGE, MAX_IMAGES } from "@/collage/grid";
import { imageFilesFrom } from "@/collage/loadImages";
import { CUSTOM_SIZE_VALUE, type SizePreset, sizePresets } from "@/collage/sizes";
import type { CanvasSpec, ExportFormat, Orientation } from "@/collage/types";
import { ExportMenu } from "./ExportMenu";

const sizeCollection = createListCollection({
  items: sizePresets,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
});

type SidebarControlsProps = {
  canvas: CanvasSpec;
  sizeValue: string;
  orientation: Orientation;
  gutter: number;
  maxGutter: number;
  gutterColor: string;
  imageCount: number;
  selectedName: string | null;
  selectedZoom: number | null;
  exportFormat: ExportFormat;
  exporting: boolean;
  onPickSize: (preset: SizePreset) => void;
  onCustomSize: (size: { width?: number; height?: number }) => void;
  onOrientationChange: (orientation: Orientation) => void;
  onRandomize: () => void;
  onGutterChange: (gutter: number) => void;
  onGutterColorChange: (color: string) => void;
  onZoomChange: (zoom: number) => void;
  onAddFiles: (files: File[]) => void;
  onReplaceSelected: (files: File[]) => void;
  onRemoveSelected: () => void;
  onFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap={3}>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        letterSpacing="wider"
        textTransform="uppercase"
        color="fg.muted"
      >
        {title}
      </Text>
      {children}
    </Stack>
  );
}

export function SidebarControls({
  canvas,
  sizeValue,
  orientation,
  gutter,
  maxGutter,
  gutterColor,
  imageCount,
  selectedName,
  selectedZoom,
  exportFormat,
  exporting,
  onPickSize,
  onCustomSize,
  onOrientationChange,
  onRandomize,
  onGutterChange,
  onGutterColorChange,
  onZoomChange,
  onAddFiles,
  onReplaceSelected,
  onRemoveSelected,
  onFormatChange,
  onExport,
}: SidebarControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const isCustomSize = sizeValue === CUSTOM_SIZE_VALUE;

  return (
    <Stack gap={7}>
      <Section title={`Images (${imageCount}/${MAX_IMAGES})`}>
        <Button
          variant="surface"
          disabled={imageCount >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          <LuImagePlus />
          Add images
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={(event) => {
            const files = imageFilesFrom(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) onAddFiles(files);
          }}
        />
        <Text fontSize="xs" color="fg.muted">
          Drop onto a photo to replace it, or anywhere else to add it.
        </Text>
      </Section>

      <Section title="Canvas">
        <Select.Root
          collection={sizeCollection}
          value={[sizeValue]}
          size="sm"
          onValueChange={(event) => {
            const preset = event.items[0] as SizePreset | undefined;
            if (preset) onPickSize(preset);
          }}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Select a size" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {sizeCollection.items.map((item) => (
                  <Select.Item item={item} key={item.value}>
                    <Stack gap={0}>
                      <Text>{item.label}</Text>
                      {item.value !== CUSTOM_SIZE_VALUE && (
                        <Text color="fg.muted" fontSize="xs">
                          {item.width} × {item.height}
                        </Text>
                      )}
                    </Stack>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>

        {isCustomSize && (
          <HStack gap={2} align="end">
            <Field.Root>
              <Field.Label fontSize="xs">Width</Field.Label>
              <NumberInput.Root
                size="sm"
                min={1}
                max={MAX_EXPORT_EDGE}
                value={String(canvas.width)}
                onValueChange={(event) => {
                  if (!Number.isNaN(event.valueAsNumber)) {
                    onCustomSize({ width: event.valueAsNumber });
                  }
                }}
              >
                <NumberInput.Control />
                <NumberInput.Input />
              </NumberInput.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs">Height</Field.Label>
              <NumberInput.Root
                size="sm"
                min={1}
                max={MAX_EXPORT_EDGE}
                value={String(canvas.height)}
                onValueChange={(event) => {
                  if (!Number.isNaN(event.valueAsNumber)) {
                    onCustomSize({ height: event.valueAsNumber });
                  }
                }}
              >
                <NumberInput.Control />
                <NumberInput.Input />
              </NumberInput.Root>
            </Field.Root>
          </HStack>
        )}
      </Section>

      <Section title="Layout">
        <SegmentGroup.Root
          size="sm"
          value={orientation}
          onValueChange={(event) => onOrientationChange(event.value as Orientation)}
        >
          <SegmentGroup.Indicator />
          <SegmentGroup.Items
            items={[
              {
                value: "rows",
                label: (
                  <HStack gap={2}>
                    <LuRows3 />
                    Rows
                  </HStack>
                ),
              },
              {
                value: "columns",
                label: (
                  <HStack gap={2}>
                    <LuColumns3 />
                    Columns
                  </HStack>
                ),
              },
            ]}
            flex="1"
          />
        </SegmentGroup.Root>
        <Text fontSize="xs" color="fg.muted">
          {orientation === "rows"
            ? "Photos sit in rows that each span the full width."
            : "Photos sit in columns that each span the full height."}
        </Text>
        <Button variant="surface" size="sm" disabled={imageCount < 2} onClick={onRandomize}>
          <LuShuffle />
          Randomize layout
        </Button>
      </Section>

      <Section title="Gutter">
        <Slider.Root
          size="sm"
          min={0}
          max={Math.max(4, Math.round(maxGutter))}
          step={1}
          value={[gutter]}
          onValueChange={(event) => onGutterChange(event.value[0] ?? gutter)}
        >
          <HStack justify="space-between">
            <Slider.Label fontSize="sm">Size</Slider.Label>
            <Text fontSize="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
              {gutter} px
            </Text>
          </HStack>
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumb index={0}>
              <Slider.HiddenInput />
            </Slider.Thumb>
          </Slider.Control>
        </Slider.Root>

        <ColorPicker.Root
          size="sm"
          value={parseColor(gutterColor)}
          onValueChange={(event) => onGutterColorChange(event.value.toString("hex"))}
        >
          <ColorPicker.HiddenInput />
          <ColorPicker.Label fontSize="sm" fontWeight="normal">
            Colour
          </ColorPicker.Label>
          <ColorPicker.Control>
            <ColorPicker.Input />
            <ColorPicker.Trigger />
          </ColorPicker.Control>
          <Portal>
            <ColorPicker.Positioner>
              <ColorPicker.Content>
                <ColorPicker.Area />
                <HStack>
                  <ColorPicker.EyeDropper size="xs" variant="outline" />
                  <ColorPicker.Sliders />
                </HStack>
              </ColorPicker.Content>
            </ColorPicker.Positioner>
          </Portal>
        </ColorPicker.Root>
      </Section>

      <Section title="Selected image">
        {selectedZoom === null ? (
          <Text fontSize="xs" color="fg.muted">
            Click a photo to zoom, replace, or remove it. Double-click to reset zoom. Drag a photo
            to move it inside its frame.
          </Text>
        ) : (
          <Stack gap={3}>
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {selectedName}
            </Text>
            <Slider.Root
              size="sm"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={[selectedZoom]}
              onValueChange={(event) => onZoomChange(event.value[0] ?? selectedZoom)}
            >
              <HStack justify="space-between">
                <Slider.Label fontSize="sm">Zoom</Slider.Label>
                <Text fontSize="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
                  {selectedZoom.toFixed(2)}×
                </Text>
              </HStack>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0}>
                  <Slider.HiddenInput />
                </Slider.Thumb>
              </Slider.Control>
            </Slider.Root>
            <Button variant="surface" size="sm" onClick={() => replaceInputRef.current?.click()}>
              <LuReplace />
              Replace image
            </Button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              hidden
              onChange={(event) => {
                const files = imageFilesFrom(event.target.files ?? []);
                event.target.value = "";
                if (files.length > 0) onReplaceSelected(files);
              }}
            />
            <Button variant="outline" colorPalette="red" size="sm" onClick={onRemoveSelected}>
              <LuTrash2 />
              Remove image
            </Button>
          </Stack>
        )}
      </Section>

      <Section title="Export">
        <ExportMenu
          canvas={canvas}
          format={exportFormat}
          disabled={imageCount === 0 || exporting}
          busy={exporting}
          onFormatChange={onFormatChange}
          onExport={onExport}
        />
      </Section>
    </Stack>
  );
}
