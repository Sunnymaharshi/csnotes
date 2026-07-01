import { useCallback, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { YStack, XStack, Text, Button } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '../../src/store/notesStore';
import { compactDate } from '../../src/lib/compactDate';
import { EmptyState } from '../../src/components/EmptyState';
import type { Note } from '../../src/types/Note';

function TrashCard({ note, onRestore }: { note: Note; onRestore: (id: string) => void }) {
  return (
    <YStack
      backgroundColor="$color2"
      borderRadius="$4"
      padding="$3"
      gap="$1"
      borderWidth={1}
      borderColor="$color4"
    >
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <Text fontSize="$4" fontWeight="600" numberOfLines={3} flex={1} color="$color11">
          {note.text.trim() || 'Empty note'}
        </Text>
        <Text fontSize="$2" color="$color9" flexShrink={0}>
          {note.deletedAt ? compactDate(note.deletedAt) : ''}
        </Text>
      </XStack>
      <Button size="$2" marginTop="$2" alignSelf="flex-start" onPress={() => onRestore(note.id)}>
        Restore
      </Button>
    </YStack>
  );
}

export default function TrashScreen() {
  const repo = useNotesStore((s) => s.repo);
  const trash = useNotesStore((s) => s.trash);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  async function handleRestore(id: string) {
    await repo?.restoreNote(id);
  }

  function confirmEmptyTrash() {
    Alert.alert(
      'Empty Trash',
      `Permanently delete ${trash.length} note${trash.length === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setEmptyingTrash(true);
            try {
              await repo?.emptyTrash();
            } finally {
              setEmptyingTrash(false);
            }
          },
        },
      ],
    );
  }

  const renderItem = useCallback(({ item }: { item: Note }) => (
    <TrashCard note={item} onRestore={handleRestore} />
  ), [repo]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <YStack flex={1}>
        {trash.length === 0 ? (
          <EmptyState label="Trash is Empty" />
        ) : (
          <>
            <XStack
              paddingHorizontal="$4"
              paddingVertical="$3"
              justifyContent="space-between"
              alignItems="center"
            >
              <Text fontSize="$3" color="$color10">
                {trash.length} note{trash.length === 1 ? '' : 's'} in trash
              </Text>
              <Button size="$3" onPress={confirmEmptyTrash} disabled={emptyingTrash}>
                {emptyingTrash ? 'Deleting…' : 'Empty Trash'}
              </Button>
            </XStack>
            <FlashList
              data={trash}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyExtractor={(item) => item.id}
            />
          </>
        )}
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16 },
  separator: { height: 8 },
});
