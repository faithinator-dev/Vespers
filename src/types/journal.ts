export type MoodKey = 'serene' | 'reflective' | 'inspired' | 'melancholy' | 'restless';

export type AppView = 'write' | 'calendar' | 'moods' | 'cafe';

export type CameraPreset = 'desk' | 'lamp' | 'journal' | 'window';

export interface MoodMeta {
  key: MoodKey;
  label: string;
  description: string;
  accentHex: string;
  softBg: string;
  borderHex: string;
}

export const MOODS: MoodMeta[] = [
  {
    key: 'serene',
    label: 'Serene',
    description: 'Calm, unhurried, settled in the quiet',
    accentHex: '#8FB996',
    softBg: 'rgba(143, 185, 150, 0.14)',
    borderHex: 'rgba(143, 185, 150, 0.42)',
  },
  {
    key: 'reflective',
    label: 'Reflective',
    description: 'Thoughtful, turning over memories and meaning',
    accentHex: '#D99B52',
    softBg: 'rgba(217, 155, 82, 0.14)',
    borderHex: 'rgba(217, 155, 82, 0.44)',
  },
  {
    key: 'inspired',
    label: 'Inspired',
    description: 'Warm sparks, ideas, and quiet momentum',
    accentHex: '#E6B86A',
    softBg: 'rgba(230, 184, 106, 0.15)',
    borderHex: 'rgba(230, 184, 106, 0.46)',
  },
  {
    key: 'melancholy',
    label: 'Melancholy',
    description: 'Tender, wistful, sitting with softer feelings',
    accentHex: '#8FA3B8',
    softBg: 'rgba(143, 163, 184, 0.14)',
    borderHex: 'rgba(143, 163, 184, 0.42)',
  },
  {
    key: 'restless',
    label: 'Restless',
    description: 'Untangling racing thoughts before sleep',
    accentHex: '#C97B63',
    softBg: 'rgba(201, 123, 99, 0.15)',
    borderHex: 'rgba(201, 123, 99, 0.44)',
  },
];

export const MOOD_MAP: Record<MoodKey, MoodMeta> = MOODS.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<MoodKey, MoodMeta>,
);

/** Verbatim blueprint limits from firebase-blueprint.json */
export const SCHEMA_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  DATE_KEY_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  ID_MAX_LEN: 128,
  DISPLAY_NAME_MAX_LEN: 120,
  EMAIL_MAX_LEN: 254,
  PHOTO_URL_MAX_LEN: 1000,
  TITLE_MAX_LEN: 200,
  CONTENT_HTML_MAX_LEN: 60000,
  PLAIN_TEXT_MAX_LEN: 40000,
  WORD_COUNT_MAX: 20000,
  PROMPT_MAX_LEN: 300,
  MOOD_NOTE_MAX_LEN: 400,
  LAMP_WARMTH_MIN: 0.2,
  LAMP_WARMTH_MAX: 1.8,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferredLampWarmth: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  dateKey: string;
  title: string;
  contentHtml: string;
  plainText: string;
  wordCount: number;
  mood: MoodKey;
  promptUsed?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface MoodLog {
  userId: string;
  dateKey: string;
  mood: MoodKey;
  note: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export const EVENING_PROMPTS: string[] = [
  'What small moment from today deserves to be remembered before midnight?',
  'If tonight had a slow soundtrack, what thoughts would rise to the surface?',
  'What felt heavy earlier that you can set down on this page?',
  'Who or what quietly steadied you today?',
  'What is one honest truth you noticed about yourself this week?',
  'Describe the atmosphere of your evening right now—light, sound, temperature.',
  'What question are you carrying gently into tomorrow?',
];
