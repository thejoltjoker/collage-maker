import {
  Box,
  ColorPicker,
  Combobox,
  Flex,
  Heading,
  HStack,
  Portal,
  Stack,
  Text,
  useFilter,
  useListCollection,
  parseColor,
} from "@chakra-ui/react";
import { useState } from "react";
import { ColorModeButton } from "@/components/ui/color-mode";

type PictureSize = {
  label: string;
  value: string;
  width: number;
  height: number;
};

const pictureSizes: PictureSize[] = [
  { label: "Instagram Post", value: "ig-post", width: 1080, height: 1080 },
  { label: "Instagram Portrait", value: "ig-portrait", width: 1080, height: 1350 },
  { label: "Instagram Story / Reels", value: "ig-story", width: 1080, height: 1920 },
  { label: "Facebook Post", value: "fb-post", width: 1200, height: 630 },
  { label: "Facebook Cover", value: "fb-cover", width: 820, height: 312 },
  { label: "X / Twitter Post", value: "x-post", width: 1600, height: 900 },
  { label: "X / Twitter Header", value: "x-header", width: 1500, height: 500 },
  { label: "LinkedIn Post", value: "li-post", width: 1200, height: 627 },
  { label: "LinkedIn Cover", value: "li-cover", width: 1584, height: 396 },
  { label: "YouTube Thumbnail", value: "yt-thumb", width: 1280, height: 720 },
  { label: "Pinterest Pin", value: "pin", width: 1000, height: 1500 },
  { label: "TikTok", value: "tiktok", width: 1080, height: 1920 },
];

function App() {
  const [selected, setSelected] = useState<PictureSize>(pictureSizes[0]);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const { contains } = useFilter({ sensitivity: "base" });
  const { collection, filter } = useListCollection({
    initialItems: pictureSizes,
    filter: contains,
  });

  return (
    <Flex minH="100dvh" w="full">
      <Box
        as="aside"
        w={{ base: "full", md: "240px" }}
        flexShrink={0}
        borderRightWidth={{ base: 0, md: "1px" }}
        borderBottomWidth={{ base: "1px", md: 0 }}
        borderColor="border"
        bg="bg.subtle"
        p={4}
      >
        <Stack gap={4}>
          <HStack justify="space-between">
            <Heading size="md">Collage Maker</Heading>
            <ColorModeButton />
          </HStack>

          <Combobox.Root
            collection={collection}
            defaultValue={[pictureSizes[0].value]}
            onInputValueChange={(e) => filter(e.inputValue)}
            onValueChange={(e) => {
              const item = pictureSizes.find((size) => size.value === e.value[0]);
              if (item) setSelected(item);
            }}
            openOnClick
            width="full"
          >
            <Combobox.Label>Picture size</Combobox.Label>
            <Combobox.Control>
              <Combobox.Input placeholder="Search sizes" />
              <Combobox.IndicatorGroup>
                <Combobox.ClearTrigger />
                <Combobox.Trigger />
              </Combobox.IndicatorGroup>
            </Combobox.Control>
            <Portal>
              <Combobox.Positioner>
                <Combobox.Content>
                  <Combobox.Empty>No sizes found</Combobox.Empty>
                  {collection.items.map((item) => (
                    <Combobox.Item item={item} key={item.value}>
                      <Stack gap={0}>
                        <Text>{item.label}</Text>
                        <Text color="fg.muted" fontSize="xs">
                          {item.width} × {item.height}
                        </Text>
                      </Stack>
                      <Combobox.ItemIndicator />
                    </Combobox.Item>
                  ))}
                </Combobox.Content>
              </Combobox.Positioner>
            </Portal>
          </Combobox.Root>

          <Stack gap={3}>
            <Heading size="sm">Background</Heading>
            <ColorPicker.Root
              defaultValue={parseColor("#ffffff")}
              onValueChange={(e) => setBackgroundColor(e.value.toString("hex"))}
              width="full"
            >
              <ColorPicker.HiddenInput />
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
          </Stack>
        </Stack>
      </Box>

      <Box as="main" flex="1" p={{ base: 4, md: 6 }} bg={backgroundColor}>
        <Heading size="lg" mb={2}>
          Canvas
        </Heading>
        <Text color="fg.muted">
          {selected.label} — {selected.width} × {selected.height} px
        </Text>
      </Box>
    </Flex>
  );
}

export default App;
