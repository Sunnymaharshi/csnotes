import { useCallback, useState } from 'react';

export function useSelectionMode() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  // Stable identities so they can be passed to memoized rows / header options
  // without forcing re-renders every parent render.
  const enter = useCallback((id: string) => setSelectedIds(new Set([id])), []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exit = useCallback(() => setSelectedIds(new Set()), []);

  return { selectedIds, isSelecting, enter, toggle, exit };
}
