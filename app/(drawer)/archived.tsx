import { useNotesStore } from '../../src/store/notesStore';
import { NoteListScreen } from '../../src/components/NoteListScreen';

export default function ArchivedScreen() {
  const archived = useNotesStore((s) => s.archived);

  return <NoteListScreen notes={archived} emptyLabel="Nothing Archived" view="archived" allowPin={false} />;
}
