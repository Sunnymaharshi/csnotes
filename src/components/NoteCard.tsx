import { memo } from 'react';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { Pin } from 'lucide-react-native';
import type { Note } from '../types/Note';
import { compactDate } from '../lib/compactDate';
import { ICON, ICON_STROKE } from '../lib/icons';
import { PressableScale } from './PressableScale';
import { longPressFeedback } from '../lib/haptics';

export const NoteCard = memo(function NoteCard({
  note,
  selectionMode = false,
  selected = false,
  onLongPress,
  onToggleSelect,
  date,
  layout = 'list',
}: {
  note: Note;
  selectionMode?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onToggleSelect?: () => void;
  date?: number;
  layout?: 'list' | 'grid';
}) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <PressableScale
      scaleTo={0.99}
      onPress={() => {
        if (selectionMode) {
          onToggleSelect?.();
        } else {
          router.push(`/note/${note.id}`);
        }
      }}
      onLongPress={() => {
        longPressFeedback();
        onLongPress?.();
      }}
    >
      <YStack
        backgroundColor={selected ? '$color3' : '$color2'}
        borderRadius={6}
        paddingHorizontal={14}
        paddingTop={6}
        paddingBottom={8}
        gap="$1"
      >
        <Text fontSize="$5" fontWeight="700" color="$color12" numberOfLines={layout === 'grid' ? 12 : 8}>
          {note.text.trim() || 'Empty note'}
        </Text>
        <XStack justifyContent="flex-end" alignItems="center" gap="$2">
          <Text fontSize="$2" color="$color9">
            {compactDate(date ?? note.updatedAt)}
          </Text>
          {note.isPinned ? (
            <Pin size={ICON.sm} strokeWidth={ICON_STROKE} color={theme.color9.val} />
          ) : null}
        </XStack>
      </YStack>
    </PressableScale>
  );
});
