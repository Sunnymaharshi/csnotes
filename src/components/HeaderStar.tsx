import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { XStack, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { ClipboardList, Star, LayoutGrid, List } from 'lucide-react-native';
import { ICON, ICON_STROKE } from '../lib/icons';
import { useLayoutStore } from '../store/layoutStore';
import { tapFeedback } from '../lib/haptics';

export function HeaderStar({ overflow }: { overflow: ReactNode }) {
  const theme = useTheme();
  const router = useRouter();
  const layout = useLayoutStore((s) => s.layout);
  const toggleLayout = useLayoutStore((s) => s.toggle);
  // Show the icon of the layout you'd switch *to*.
  const LayoutIcon = layout === 'list' ? LayoutGrid : List;

  return (
    <XStack alignItems="center" gap="$3" paddingRight="$2">
      <Pressable
        onPress={() => router.push('/')}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}
      >
        <ClipboardList size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/favourites')}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}
      >
        <Star size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>
      <Pressable
        onPress={() => {
          tapFeedback();
          toggleLayout();
        }}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 6 })}
      >
        <LayoutIcon size={ICON.md} strokeWidth={ICON_STROKE} color={theme.color12.val} />
      </Pressable>
      {overflow}
    </XStack>
  );
}
