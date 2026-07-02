import { useState } from 'react';

export function useSelectionMode() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  function enter(id: string) {
    setSelectedIds(new Set([id]));
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exit() {
    setSelectedIds(new Set());
  }

  return { selectedIds, isSelecting, enter, toggle, exit };
}
