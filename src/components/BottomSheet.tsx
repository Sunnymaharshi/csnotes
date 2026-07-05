import { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { ICON, ICON_STROKE } from '../lib/icons';
import type { OverflowItem } from './OverflowMenu';

/**
 * Bottom-anchored sheet — the thumb-reachable counterpart to OverflowMenu's
 * top-right dropdown (§8.5). The whole sheet follows the finger on a downward
 * drag (reanimated + gesture-handler); releasing past a threshold dismisses,
 * otherwise it springs back. Tapping the backdrop or hardware back also closes.
 * Note: gestures inside a RN Modal need their own GestureHandlerRootView.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const translateY = useSharedValue(0);

  // Reset any leftover drag offset each time the sheet reopens.
  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const pan = Gesture.Pan()
    // Only claim clearly-downward drags, so taps and upward motion fall through
    // to the rows underneath.
    .activeOffsetY(10)
    .failOffsetY(-12)
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
          <GestureDetector gesture={pan}>
            <Animated.View style={sheetStyle}>
              {/* Stop the inner press from bubbling to the backdrop's onClose. */}
              <Pressable onPress={(e) => e.stopPropagation()}>
                <YStack
                  backgroundColor="$color2"
                  borderTopLeftRadius="$6"
                  borderTopRightRadius="$6"
                  borderColor="$color4"
                  borderWidth={1}
                  paddingBottom={insets.bottom + 12}
                  elevation={12}
                >
                  {/* Grabber — visual "pull me down" affordance. */}
                  <View style={{ paddingTop: 10, paddingBottom: 8, alignItems: 'center' }}>
                    <View
                      style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.color7.val }}
                    />
                  </View>
                  {children}
                </YStack>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

function SheetRow({ item, onClose }: { item: OverflowItem; onClose: () => void }) {
  const theme = useTheme();
  const { label, icon: Icon, onPress } = item;
  return (
    <Pressable
      onPress={() => {
        onClose();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <XStack alignItems="center" gap="$4" paddingVertical="$3" paddingHorizontal="$5">
        <Icon size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
        <Text fontSize="$5" color="$color12">
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

/**
 * A BottomSheet rendering a flat list of {label, icon, onPress} rows — the same
 * OverflowItem shape produced by useGlobalOverflowItems and the nav item lists.
 */
export function BottomSheetMenu({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: OverflowItem[];
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {items.map((item) => (
        <SheetRow key={item.label} item={item} onClose={onClose} />
      ))}
    </BottomSheet>
  );
}

export interface SheetSection {
  label?: string;
  items: OverflowItem[];
}

/**
 * A BottomSheet grouping rows into labelled sections separated by dividers —
 * used by the bottom-nav hamburger, which mixes actions (Sort/Layout) with
 * navigation (Archived/Trash/Settings). Empty sections are skipped.
 */
export function BottomSheetSections({
  visible,
  onClose,
  sections,
}: {
  visible: boolean;
  onClose: () => void;
  sections: SheetSection[];
}) {
  const shown = sections.filter((s) => s.items.length > 0);
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {shown.map((section, i) => (
        <YStack key={section.label ?? i}>
          {i > 0 ? <YStack height={1} backgroundColor="$color4" marginVertical="$2" /> : null}
          {section.label ? (
            <Text
              fontSize="$2"
              fontWeight="700"
              letterSpacing={0.8}
              color="$color10"
              paddingHorizontal="$5"
              paddingTop="$2"
              paddingBottom="$1"
              textTransform="uppercase"
            >
              {section.label}
            </Text>
          ) : null}
          {section.items.map((item) => (
            <SheetRow key={item.label} item={item} onClose={onClose} />
          ))}
        </YStack>
      ))}
    </BottomSheet>
  );
}
