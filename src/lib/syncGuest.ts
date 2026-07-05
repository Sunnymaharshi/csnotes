import { signInWithGoogle } from './googleAuth';
import { createFirestoreRepo } from '../data/firestoreNotesRepo';
import { localRepo, clearLocalNotes } from '../data/localNotesRepo';

/**
 * Sign in with Google from guest mode and migrate on-device notes into the
 * account. importNotes is a batched upsert-by-id and local ids are fresh uuids,
 * so merging into an account that already has notes (from another device) is
 * additive and collision-free. Returns the number of notes migrated.
 */
export async function signInAndSync(): Promise<number> {
  const local = await localRepo.exportNotes();
  const cred = await signInWithGoogle();
  const fsRepo = createFirestoreRepo(cred.user.uid);
  if (local.length) await fsRepo.importNotes(local);
  await clearLocalNotes();
  return local.length;
}
