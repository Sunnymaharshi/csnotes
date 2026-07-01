import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '../../src/store/notesStore';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import type { Note } from '../../src/types/Note';

export default function ArchivedScreen() {
  const archived = useNotesStore((s) => s.archived);

  const renderItem = useCallback(({ item }: { item: Note }) => (
    <NoteCard note={item} />
  ), []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {archived.length === 0 ? (
        <EmptyState label="Nothing Archived" />
      ) : (
        <FlashList
          data={archived}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyExtractor={(item) => item.id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: { padding: 16 },
  separator: { height: 8 },
});
