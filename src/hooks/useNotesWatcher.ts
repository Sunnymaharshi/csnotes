import { useEffect } from 'react';
import { useNotesStore } from '../store/notesStore';

export function useNotesWatcher() {
  const repo = useNotesStore((s) => s.repo);
  const setAllNotes = useNotesStore((s) => s.setAllNotes);
  const setFavourites = useNotesStore((s) => s.setFavourites);
  const setArchived = useNotesStore((s) => s.setArchived);
  const setTrash = useNotesStore((s) => s.setTrash);

  useEffect(() => {
    if (!repo) return;
    const unsub1 = repo.watchAllNotes(setAllNotes);
    const unsub2 = repo.watchFavourites(setFavourites);
    const unsub3 = repo.watchArchived(setArchived);
    const unsub4 = repo.watchTrash(setTrash);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [repo, setAllNotes, setFavourites, setArchived, setTrash]);
}
