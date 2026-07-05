import { useShareIntentContext } from 'expo-share-intent';
import { useNotesStore } from '../../src/store/notesStore';
import { NoteListScreen } from '../../src/components/NoteListScreen';

export default function NotesScreen() {
  const allNotes = useNotesStore((s) => s.allNotes);
  const { hasShareIntent, shareIntent } = useShareIntentContext();

  // A pending share is about to redirect this screen away to the note editor
  // (see app/_layout.tsx) — render nothing instead of the list so it doesn't
  // flash on screen for a frame first.
  if (hasShareIntent && shareIntent.text) return null;

  return <NoteListScreen notes={allNotes} emptyLabel="No Notes" view="all" showFab />;
}
