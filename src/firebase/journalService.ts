import {
  User,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './config';
import { OperationType, handleFirestoreError } from './errors';
import {
  JournalEntry,
  MoodKey,
  MoodLog,
  SCHEMA_LIMITS,
  UserProfile,
} from '../types/journal';
import { countWords, extractPlainText, sanitizeJournalHtml } from '../utils/sanitize';

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function timestampToMs(ts: unknown): number {
  if (ts instanceof Timestamp) {
    return ts.toMillis();
  }
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  const safeDisplayName = clampString(
    user.displayName || user.email?.split('@')[0] || 'Night Writer',
    SCHEMA_LIMITS.DISPLAY_NAME_MAX_LEN,
  );
  const safeEmail = clampString(user.email || '', SCHEMA_LIMITS.EMAIL_MAX_LEN);
  const safePhoto = user.photoURL
    ? clampString(user.photoURL, SCHEMA_LIMITS.PHOTO_URL_MAX_LEN)
    : undefined;

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!snap.exists()) {
    const payload: Record<string, unknown> = {
      uid: user.uid,
      displayName: safeDisplayName,
      email: safeEmail,
      preferredLampWarmth: 1.0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (safePhoto) {
      payload.photoURL = safePhoto;
    }

    try {
      await setDoc(ref, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    return {
      uid: user.uid,
      displayName: safeDisplayName,
      email: safeEmail,
      photoURL: safePhoto,
      preferredLampWarmth: 1.0,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
  }

  const data = snap.data();
  const existingWarmth =
    typeof data.preferredLampWarmth === 'number'
      ? Math.min(
          SCHEMA_LIMITS.LAMP_WARMTH_MAX,
          Math.max(SCHEMA_LIMITS.LAMP_WARMTH_MIN, data.preferredLampWarmth),
        )
      : 1.0;

  return {
    uid: String(data.uid || user.uid),
    displayName: String(data.displayName || safeDisplayName),
    email: String(data.email || safeEmail),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
    preferredLampWarmth: existingWarmth,
    createdAtMs: timestampToMs(data.createdAt),
    updatedAtMs: timestampToMs(data.updatedAt),
  };
}

export async function updateLampWarmth(uid: string, warmth: number): Promise<void> {
  const path = `users/${uid}`;
  const clamped = Math.min(
    SCHEMA_LIMITS.LAMP_WARMTH_MAX,
    Math.max(SCHEMA_LIMITS.LAMP_WARMTH_MIN, Number(warmth.toFixed(2))),
  );
  try {
    await updateDoc(doc(db, 'users', uid), {
      preferredLampWarmth: clamped,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeEntries(
  uid: string,
  onData: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = `users/${uid}/entries`;
  const q = query(collection(db, 'users', uid, 'entries'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalEntry[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: String(raw.id || d.id),
          userId: String(raw.userId || uid),
          dateKey: String(raw.dateKey || ''),
          title: String(raw.title || ''),
          contentHtml: String(raw.contentHtml || ''),
          plainText: String(raw.plainText || ''),
          wordCount: typeof raw.wordCount === 'number' ? raw.wordCount : 0,
          mood: raw.mood as MoodKey,
          promptUsed: typeof raw.promptUsed === 'string' ? raw.promptUsed : undefined,
          createdAtMs: timestampToMs(raw.createdAt),
          updatedAtMs: timestampToMs(raw.updatedAt),
        };
      });

      items.sort((a, b) => {
        if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
        return b.createdAtMs - a.createdAtMs;
      });

      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    },
  );
}

export function subscribeMoodLogs(
  uid: string,
  onData: (logs: MoodLog[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const path = `users/${uid}/moodLogs`;
  const q = query(collection(db, 'users', uid, 'moodLogs'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MoodLog[] = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          userId: String(raw.userId || uid),
          dateKey: String(raw.dateKey || d.id),
          mood: raw.mood as MoodKey,
          note: String(raw.note || ''),
          createdAtMs: timestampToMs(raw.createdAt),
          updatedAtMs: timestampToMs(raw.updatedAt),
        };
      });

      items.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    },
  );
}

export interface SaveEntryPayload {
  id?: string;
  dateKey: string;
  title: string;
  contentHtml: string;
  mood: MoodKey;
  promptUsed?: string;
}

export async function saveJournalEntry(
  uid: string,
  input: SaveEntryPayload,
): Promise<string> {
  if (!SCHEMA_LIMITS.DATE_KEY_PATTERN.test(input.dateKey)) {
    throw new Error('Invalid date format.');
  }

  const entryId =
    input.id && SCHEMA_LIMITS.ID_PATTERN.test(input.id)
      ? input.id.slice(0, SCHEMA_LIMITS.ID_MAX_LEN)
      : `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const sanitizedHtml = sanitizeJournalHtml(input.contentHtml).slice(
    0,
    SCHEMA_LIMITS.CONTENT_HTML_MAX_LEN,
  );
  const plainText = extractPlainText(sanitizedHtml).slice(
    0,
    SCHEMA_LIMITS.PLAIN_TEXT_MAX_LEN,
  );
  const wordCount = Math.min(SCHEMA_LIMITS.WORD_COUNT_MAX, countWords(plainText));
  const title = clampString(input.title || 'Untitled Evening', SCHEMA_LIMITS.TITLE_MAX_LEN);
  const promptUsed = input.promptUsed
    ? clampString(input.promptUsed, SCHEMA_LIMITS.PROMPT_MAX_LEN)
    : undefined;

  const path = `users/${uid}/entries/${entryId}`;
  const ref = doc(db, 'users', uid, 'entries', entryId);

  if (input.id) {
    const updatePayload: Record<string, unknown> = {
      dateKey: input.dateKey,
      title,
      contentHtml: sanitizedHtml,
      plainText,
      wordCount,
      mood: input.mood,
      updatedAt: serverTimestamp(),
    };
    if (promptUsed) {
      updatePayload.promptUsed = promptUsed;
    }

    try {
      await updateDoc(ref, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return entryId;
  }

  const createPayload: Record<string, unknown> = {
    id: entryId,
    userId: uid,
    dateKey: input.dateKey,
    title,
    contentHtml: sanitizedHtml,
    plainText,
    wordCount,
    mood: input.mood,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (promptUsed) {
    createPayload.promptUsed = promptUsed;
  }

  try {
    await setDoc(ref, createPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return entryId;
}

export async function deleteJournalEntry(uid: string, entryId: string): Promise<void> {
  if (!SCHEMA_LIMITS.ID_PATTERN.test(entryId)) {
    throw new Error('Invalid entry identifier.');
  }
  const path = `users/${uid}/entries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'entries', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveMoodLog(
  uid: string,
  dateKey: string,
  mood: MoodKey,
  note: string,
  existsAlready: boolean,
): Promise<void> {
  if (!SCHEMA_LIMITS.DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error('Invalid date format.');
  }
  const safeNote = clampString(note, SCHEMA_LIMITS.MOOD_NOTE_MAX_LEN);
  const path = `users/${uid}/moodLogs/${dateKey}`;
  const ref = doc(db, 'users', uid, 'moodLogs', dateKey);

  if (existsAlready) {
    try {
      await updateDoc(ref, {
        mood,
        note: safeNote,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return;
  }

  try {
    await setDoc(ref, {
      userId: uid,
      dateKey,
      mood,
      note: safeNote,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
