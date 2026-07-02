import { useNotesStore } from '../../src/store/notesStore';
import { NoteListScreen } from '../../src/components/NoteListScreen';

export default function NotesScreen() {
  const allNotes = useNotesStore((s) => s.allNotes);

  return <NoteListScreen notes={allNotes} emptyLabel="No Notes" showFab />;
}
