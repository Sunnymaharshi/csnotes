import { useNotesStore } from '../../src/store/notesStore';
import { NoteListScreen } from '../../src/components/NoteListScreen';

export default function FavouritesScreen() {
  const favourites = useNotesStore((s) => s.favourites);

  return <NoteListScreen notes={favourites} emptyLabel="No Favourites" />;
}
