import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { YStack, Text, useTheme } from 'tamagui';
import { useLinkSheetStore, type LinkSheetAction } from '../store/linkSheetStore';
import { tapFeedback } from '../lib/haptics';

const MARGIN = 8; // keep the menu off the screen edges
const GAP = 14; // vertical offset from the tapped point

/** Global themed popover for link actions — mount once at the app root. Tapping
 * a link in the note view opens this compact menu anchored beside the link, so
 * the user picks Open / Call / Copy / Edit / Share without navigating away. */
export function LinkOptionsMenu() {
  const { visible, anchor, actions, hide } = useLinkSheetStore();
  const { width: sw, height: sh } = useWindowDimensions();
  const theme = useTheme();
  // Measured on first layout so we can clamp the menu fully on-screen and flip
  // it above the finger when there isn't room below.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Re-measure each time the menu closes: different link kinds have different
  // row counts (hence heights), and the anchor moves, so a stale size would
  // mis-place or wrongly flip the next open. (Modal's onDismiss is iOS-only.)
  useEffect(() => {
    if (!visible) setSize(null);
  }, [visible]);

  function handlePress(action: LinkSheetAction) {
    hide();
    tapFeedback();
    action.onPress();
  }

  // Position: open below-right of the tap, clamped to the viewport; flip above
  // if it would overflow the bottom.
  let left = anchor.x;
  let top = anchor.y + GAP;
  if (size) {
    if (left + size.w > sw - MARGIN) left = sw - MARGIN - size.w;
    if (left < MARGIN) left = MARGIN;
    if (top + size.h > sh - MARGIN) top = anchor.y - GAP - size.h;
    if (top < MARGIN) top = MARGIN;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hide}
    >
      <Pressable style={styles.backdrop} onPress={hide}>
        <YStack
          position="absolute"
          left={left}
          top={top}
          // Hidden until measured to avoid a one-frame flash at the wrong spot.
          opacity={size ? 1 : 0}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (!size) setSize({ w: width, h: height });
          }}
          borderRadius={14}
          // Soft, low-spread shadow (Material menu feel) rather than the hard
          // default elevation blob. Lives on the outer layer so it isn't clipped
          // by the inner overflow:hidden that rounds the ripple.
          elevation={3}
          shadowColor="#000"
          shadowOpacity={0.18}
          shadowRadius={16}
          shadowOffset={{ width: 0, height: 6 }}
        >
          <YStack
            backgroundColor="$color1"
            borderRadius={14}
            borderWidth={StyleSheet.hairlineWidth}
            borderColor="$color4"
            paddingVertical={4}
            minWidth={132}
            overflow="hidden"
          >
            {actions.map((action, i) => (
              // A tap here fires the action; because this sits above the backdrop
              // Pressable, the outside-tap dismiss doesn't also swallow it.
              <Pressable
                key={`${action.label}-${i}`}
                onPress={() => handlePress(action)}
                android_ripple={{ color: theme.color4.val }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: theme.color3.val },
                ]}
              >
                <Text fontSize="$4" fontWeight="500" color="$color12">
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </YStack>
        </YStack>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Near-transparent: a compact popover shouldn't dim the whole screen like a
    // modal dialog, just capture the outside-tap to dismiss.
    backgroundColor: 'transparent',
  },
  row: {
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
});
