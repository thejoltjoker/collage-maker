import { ActionBar, Button, CloseButton, Kbd, Portal } from "@chakra-ui/react";
import { LuFlipHorizontal2, LuFlipVertical2, LuRotateCw } from "react-icons/lu";

type SelectionActionBarProps = {
  open: boolean;
  imageName: string | null;
  onClose: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onRotateClockwise: () => void;
};

export function SelectionActionBar({
  open,
  imageName,
  onClose,
  onFlipHorizontal,
  onFlipVertical,
  onRotateClockwise,
}: SelectionActionBarProps) {
  return (
    <ActionBar.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      closeOnInteractOutside={false}
      autoFocus={false}
    >
      <Portal>
        <ActionBar.Positioner>
          <ActionBar.Content>
            <ActionBar.SelectionTrigger>{imageName ?? "Photo"}</ActionBar.SelectionTrigger>
            <ActionBar.Separator />
            <Button size="sm" variant="outline" onClick={onFlipHorizontal}>
              <LuFlipHorizontal2 />
              Flip horizontal
            </Button>
            <Button size="sm" variant="outline" onClick={onFlipVertical}>
              <LuFlipVertical2 />
              Flip vertical
            </Button>
            <Button size="sm" variant="outline" onClick={onRotateClockwise}>
              <LuRotateCw />
              Rotate <Kbd size="sm">90°</Kbd>
            </Button>
            <ActionBar.CloseTrigger asChild>
              <CloseButton size="sm" />
            </ActionBar.CloseTrigger>
          </ActionBar.Content>
        </ActionBar.Positioner>
      </Portal>
    </ActionBar.Root>
  );
}
