import { useEffect, useRef, useState } from 'react';
import { useDrawerStatus } from 'expo-router/drawer';

// Tapping outside an open drawer to dismiss it can, on web, let the same
// click "pass through" to whatever list item is underneath the overlay.
// Locking content taps while the drawer is open (and briefly after it
// finishes closing) prevents that ghost tap from opening a note.
const CLOSE_GUARD_MS = 350;

export function useDrawerCloseGuard() {
  const status = useDrawerStatus();
  const [locked, setLocked] = useState(status !== 'closed');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== 'closed') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLocked(true);
      return;
    }
    timeoutRef.current = setTimeout(() => setLocked(false), CLOSE_GUARD_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status]);

  return locked;
}
