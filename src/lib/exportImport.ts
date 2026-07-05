// Android implementation — backups live in a user-chosen folder (e.g. "CS Notes")
// via the Storage Access Framework, so exports land in a real, browsable place
// and imports can read straight back from it.
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note } from '../types/Note';

const SAF = FileSystem.StorageAccessFramework;
// Persisted content-URI of the granted backup folder.
const DIR_KEY = '@csnotes/backup_dir';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function backupFilename(): string {
  // Date, then 12-hour time (colon-free), then label:
  // "03Jul2026 02-30-07PM CS Notes.json".
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${p(d.getDate())}${MONTHS[d.getMonth()]}${d.getFullYear()}`;
  const ampm = d.getHours() < 12 ? 'AM' : 'PM';
  const hour12 = d.getHours() % 12 || 12;
  const time = `${p(hour12)}-${p(d.getMinutes())}-${p(d.getSeconds())}${ampm}`;
  return `${date} ${time} CS Notes.json`;
}

// Ask the user to grant a folder and remember it. Called on first export or when
// the saved grant is gone. The user can create/pick a "CS Notes" folder here.
async function requestBackupDir(): Promise<string> {
  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted) throw new Error('No folder selected');
  await AsyncStorage.setItem(DIR_KEY, perm.directoryUri);
  return perm.directoryUri;
}

async function savedBackupDir(): Promise<string | null> {
  return AsyncStorage.getItem(DIR_KEY);
}

/** Writes the backup into the chosen folder and returns the filename. Reuses the
 *  remembered folder; only prompts for one when none is set or the grant is
 *  stale — so repeated exports just work (no share sheet, no collisions since
 *  each filename is unique to the second and SAF de-dupes anyway). */
export async function exportNotes(notes: Note[]): Promise<string> {
  const json = JSON.stringify(notes, null, 2);
  const filename = backupFilename();

  const writeInto = async (dir: string) => {
    const fileUri = await SAF.createFileAsync(dir, filename, 'application/json');
    await FileSystem.writeAsStringAsync(fileUri, json);
  };

  let dir = (await savedBackupDir()) ?? (await requestBackupDir());
  try {
    await writeInto(dir);
  } catch {
    // Saved grant was likely revoked/moved — ask once more, then retry.
    dir = await requestBackupDir();
    await writeInto(dir);
  }
  return filename;
}

/** Opens the system file manager to pick a backup .json (the user browses to
 *  their CS Notes folder), then reads + validates it. */
export async function pickAndImportNotes(): Promise<Note[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return [];
  const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
  return validateNotes(JSON.parse(text));
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
