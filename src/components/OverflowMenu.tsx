import { useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { MoreVertical, type LucideIcon } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../lib/icons';

export interface OverflowItem {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}

export function OverflowMenu({ items }: { items: OverflowItem[] }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 8 })}
      >
        <MoreVertical size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <YStack
            position="absolute"
            top="$6"
            right="$4"
            backgroundColor="$color2"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$color4"
            paddingVertical="$2"
            minWidth={200}
            elevation={8}
          >
            {items.map(({ label, icon: Icon, onPress }) => (
              <Pressable
                key={label}
                onPress={() => {
                  setOpen(false);
                  onPress();
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <XStack alignItems="center" gap="$3" paddingVertical="$3" paddingHorizontal="$4">
                  <Icon size={ICON.sm} strokeWidth={ICON_STROKE} color={theme.color12.val} />
                  <Text fontSize="$4" color="$color12">
                    {label}
                  </Text>
                </XStack>
              </Pressable>
            ))}
          </YStack>
        </Pressable>
      </Modal>
    </>
  );
}
