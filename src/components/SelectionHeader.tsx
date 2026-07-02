import { Pressable } from 'react-native';
import { XStack, Text, useTheme } from 'tamagui';
import { X, Star, Share2 } from 'lucide-react-native';
import { OverflowMenu, type OverflowItem } from './OverflowMenu';
import { ICON, ICON_STROKE } from '../lib/icons';

export function SelectionHeaderLeft({ count, onBack }: { count: number; onBack: () => void }) {
  const theme = useTheme();
  return (
    <XStack alignItems="center" gap="$3" paddingLeft="$2">
      <Pressable onPress={onBack} hitSlop={8}>
        <X size={ICON.lg} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>
      <Text fontSize="$6" fontWeight="700" color="$color12">
        {count}
      </Text>
    </XStack>
  );
}

export function SelectionHeaderRight({
  onFavourite,
  onShare,
  overflowItems,
}: {
  onFavourite: () => void;
  onShare: () => void;
  overflowItems: OverflowItem[];
}) {
  const theme = useTheme();
  return (
    <XStack alignItems="center" gap="$1" paddingRight="$2">
      <Pressable onPress={onFavourite} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}>
        <Star size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>
      <Pressable onPress={onShare} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}>
        <Share2 size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>
      <OverflowMenu items={overflowItems} />
    </XStack>
  );
}
