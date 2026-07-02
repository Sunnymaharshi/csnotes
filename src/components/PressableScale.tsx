import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { tapFeedback } from '../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  /** How far to scale down on press. Default 0.97 (subtle). */
  scaleTo?: number;
  /** Fire a light selection haptic on press-in. Default false. */
  haptic?: boolean;
};

/**
 * Drop-in replacement for RN Pressable that adds a subtle press-scale animation
 * (and optional haptic) in one place, so press feedback stays uniform across the
 * app instead of being re-implemented as `opacity` at every call site.
 */
export const PressableScale = forwardRef<View, Props>(function PressableScale(
  { scaleTo = 0.97, haptic = false, onPressIn, onPressOut, style, children, ...rest },
  ref,
) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      ref={ref}
      style={[animatedStyle, style as object]}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        if (haptic) tapFeedback();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 120 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children as React.ReactNode}
    </AnimatedPressable>
  );
});
