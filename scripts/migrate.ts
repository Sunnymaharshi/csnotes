// One-time importer: old Notes.db (SQLite) -> notes-export.json (app's Import format).
// Usage: node scripts/migrate.ts [path/to/Notes.db]
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Note {
  id: string;
  text: string;
  isFavourite: boolean;
  isArchived: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface OldRow {
  _id: number;
  notes: string;
  date: string;
  time: string;
  state: number;
  rem: string;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// "30Mar 2021 12:38 PM" -> epoch millis, or null if no year present (old-style short rows).
function parseFullTimestamp(time: string): number | null {
  const m = time.trim().match(/^(\d{1,2})([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!m) return null;
  const [, day, mon, year, hourStr, minute, ampm] = m;
  const month = MONTHS[mon];
  if (month === undefined) return null;
  let hour = parseInt(hourStr, 10) % 12;
  if (ampm === 'PM') hour += 12;
  return new Date(Number(year), month, Number(day), hour, Number(minute)).getTime();
}

const dbPath = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), 'Notes.db');
const outPath = join(dirname(fileURLToPath(import.meta.url)), 'notes-export.json');

const db = new DatabaseSync(dbPath, { readOnly: true });
const rows = db.prepare('SELECT _id, notes, date, time, state, rem FROM Notes_Table ORDER BY _id ASC').all() as unknown as OldRow[];
db.close();

// Resolve timestamps: rows with a full "date + year" string parse directly; older rows
// that only stored time-of-day get synthesized timestamps that preserve _id order,
// interpolated between the surrounding rows that did parse.
const resolved: (number | null)[] = rows.map((r) => parseFullTimestamp(r.time));

for (let i = 0; i < resolved.length; i++) {
  if (resolved[i] !== null) continue;
  let j = i;
  while (j < resolved.length && resolved[j] === null) j++;
  const gapStart = i;
  const gapEnd = j; // exclusive, index of next resolved row (or resolved.length)
  const count = gapEnd - gapStart;

  const before = gapStart > 0 ? resolved[gapStart - 1]! : null;
  const after = gapEnd < resolved.length ? resolved[gapEnd]! : null;

  const STEP_MS = 60_000; // 1 minute
  let base: number;
  if (after !== null) {
    base = after - (count + 1) * STEP_MS; // land strictly before `after`
  } else if (before !== null) {
    base = before + STEP_MS;
  } else {
    base = Date.now() - count * STEP_MS; // no anchors at all — fall back to "now"
  }

  for (let k = 0; k < count; k++) {
    resolved[gapStart + k] = base + k * STEP_MS;
  }

  i = gapEnd - 1;
}

// The old app rendered every list by `_id DESC` (insertion order); the stored time is the
// last-edit time and is non-monotonic vs `_id`. `createdAt` drives the new app's default
// Created-desc sort, so it MUST increase with `_id` to reproduce the old order. We can't just
// use the real dates (they jump around) and clamping them forward collapses ranges whenever a
// future-dated note sits early. Instead spread `createdAt` evenly across the real date span in
// `_id` order: strictly increasing (order preserved) and varied/real-ish across 2021->2026.
// `createdAt` is never displayed — only sorted on — so exact per-note accuracy is irrelevant.
// `updatedAt` keeps the true edit date for display (the card shows it), so edited-out-of-order
// notes end up with createdAt > updatedAt, which is fine and invisible.
const realTimes = resolved.filter((t): t is number => t !== null);
const minTs = Math.min(...realTimes);
const maxTs = Math.max(...realTimes);
const span = maxTs - minTs;
const n = rows.length;

const notes: Note[] = rows.map((r, idx) => {
  const created = n === 1 ? minTs : Math.round(minTs + (span * idx) / (n - 1));
  const edited = parseFullTimestamp(r.time); // true edit date, or null for the undated row
  return {
    id: randomUUID(),
    text: r.notes,
    isFavourite: r.state === 2,
    isArchived: r.state === 9,
    deletedAt: null,
    createdAt: created,
    updatedAt: edited ?? created,
  };
});

writeFileSync(outPath, JSON.stringify(notes, null, 2));
console.log(`Migrated ${notes.length} notes -> ${outPath}`);

const skipped = rows.filter((r) => ![1, 2, 8, 9].includes(r.state) && r.state !== 9);
if (skipped.length) {
  console.warn(`Note: ${skipped.length} row(s) had unexpected state values (imported as plain notes):`, skipped.map((r) => r._id));
}
