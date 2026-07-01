const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Old-app style compact date, e.g. "01Jul" (day + short month, no year). */
export function compactDate(ms: number): string {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}${MONTHS[d.getMonth()]}`;
}

/** Full date+time for the editor sub-header, e.g. "01Jul 2026 10:07 AM". */
export function fullDateTime(ms: number): string {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, '0');
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}${MONTHS[d.getMonth()]} ${d.getFullYear()} ${String(h).padStart(2, '0')}:${min} ${ampm}`;
}
