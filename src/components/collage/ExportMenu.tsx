import { Button, SegmentGroup, Stack, Text } from "@chakra-ui/react";
import { LuDownload } from "react-icons/lu";
import type { CanvasSpec, ExportFormat } from "@/collage/types";

type ExportMenuProps = {
  canvas: CanvasSpec;
  format: ExportFormat;
  disabled: boolean;
  busy: boolean;
  onFormatChange: (format: ExportFormat) => void;
  onExport: () => void;
};

export function ExportMenu({
  canvas,
  format,
  disabled,
  busy,
  onFormatChange,
  onExport,
}: ExportMenuProps) {
  return (
    <Stack gap={3}>
      <SegmentGroup.Root
        size="sm"
        value={format}
        onValueChange={(event) => onFormatChange(event.value as ExportFormat)}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items
          items={[
            { value: "png", label: "PNG" },
            { value: "jpeg", label: "JPG" },
          ]}
          flex="1"
        />
      </SegmentGroup.Root>

      <Button colorPalette="blue" disabled={disabled} loading={busy} onClick={onExport}>
        <LuDownload />
        Export collage
      </Button>

      <Text fontSize="xs" color="fg.muted">
        {canvas.width} × {canvas.height} px
        {format === "jpeg" ? ", JPG at 92% quality" : ", lossless PNG"}
      </Text>
    </Stack>
  );
}
