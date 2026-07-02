import { useMemo, useState } from 'react';
import type { Note } from '../types/Note';

export function useSearchBar(notes: Note[]) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  function open() {
    setVisible(true);
  }

  function close() {
    setVisible(false);
    setQuery('');
  }

  const displayedNotes = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.trim().toLowerCase();
    return notes.filter((n) => n.text.toLowerCase().includes(q));
  }, [notes, query]);

  return { visible, query, setQuery, open, close, displayedNotes };
}
