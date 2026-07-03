// Android implementation
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { Note } from '../types/Note';

export async function exportNotes(notes: Note[]): Promise<void> {
  const json = JSON.stringify(notes, null, 2);
  // Local date + time, colon-free for filesystem safety: csnotes-backup-2026-07-03_14-30.json
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
  const filename = `csnotes-backup-${stamp}.json`;
  const file = new File(Paths.cache, filename);
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
}

export async function pickAndImportNotes(): Promise<Note[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return [];
  const file = new File(result.assets[0].uri);
  const text = await file.text();
  const parsed = JSON.parse(text);
  return validateNotes(parsed);
}

function validateNotes(data: unknown): Note[] {
  if (!Array.isArray(data)) throw new Error('Expected a JSON array of notes');
  return data.filter(
    (item): item is Note =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Note).id === 'string' &&
      typeof (item as Note).text === 'string',
  );
}
