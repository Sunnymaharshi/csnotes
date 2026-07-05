import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, Text, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Star, Share2, MoreVertical, type LucideIcon } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../lib/icons';
import { BottomSheetMenu } from './BottomSheet';
import { BOTTOM_BAR_HEIGHT } from './BottomBar';
import type { OverflowItem } from './OverflowMenu';

/**
 * Bottom counterpart to SelectionHeader (§8.5) — shown while multi-selecting in
 * bottom-nav mode so the bulk actions stay in the thumb zone. Left: close +
 * count; right: Favourite / Delete / Share / Pin / More (More opens the
 * remaining buildSelectionOverflowItems as a bottom sheet).
 */
export function BottomSelectionBar({
  count,
  onBack,
  onFavourite,
  onShare,
  pinItem,
  deleteItem,
  overflowItems,
}: {
  count: number;
  onBack: () => void;
  onFavourite: () => void;
  onShare: () => void;
  pinItem?: OverflowItem | null;
  deleteItem?: OverflowItem;
  overflowItems: OverflowItem[];
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        height={BOTTOM_BAR_HEIGHT + insets.bottom}
        paddingBottom={insets.bottom}
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$color2"
        borderTopWidth={1}
        borderTopColor="$color4"
      >
        <XStack alignItems="center" gap="$4">
          <Pressable onPress={onBack} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <X size={ICON.lg} strokeWidth={ICON_STROKE} color={theme.color12.val} />
          </Pressable>
          <Text fontSize="$6" fontWeight="700" color="$color12">
            {count}
          </Text>
        </XStack>

        <XStack alignItems="center" gap="$2">
          <BarButton icon={Star} onPress={onFavourite} color={theme.color12.val} />
          {deleteItem ? <BarButton icon={deleteItem.icon} onPress={deleteItem.onPress} color={theme.color12.val} /> : null}
          <BarButton icon={Share2} onPress={onShare} color={theme.color12.val} />
          {pinItem ? <BarButton icon={pinItem.icon} onPress={pinItem.onPress} color={theme.color12.val} /> : null}
          {overflowItems.length > 0 ? (
            <BarButton icon={MoreVertical} onPress={() => setMoreOpen(true)} color={theme.color12.val} />
          ) : null}
        </XStack>
      </XStack>

      <BottomSheetMenu visible={moreOpen} onClose={() => setMoreOpen(false)} items={overflowItems} />
    </>
  );
}

function BarButton({
  icon: Icon,
  onPress,
  color,
}: {
  icon: LucideIcon;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.barButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon size={ICON.md} strokeWidth={ICON_STROKE} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barButton: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
});
