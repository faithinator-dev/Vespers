import { JournalEntry } from '../types/journal';
import { getLastNDaysKeys, parseDateKey, toLocalDateKey } from './dates';

export interface WeekDayDot {
  dateKey: string;
  shortDay: string;
  hasEntry: boolean;
  isToday: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  wroteToday: boolean;
  totalEntries: number;
  entriesThisMonth: number;
  totalWords: number;
  lastSevenDays: WeekDayDot[];
  gentleMessage: string;
}

export function computeStreakSummary(entries: JournalEntry[]): StreakSummary {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterdayDate);
  const currentMonthPrefix = todayKey.slice(0, 7);

  const uniqueDatesSet = new Set<string>();
  let totalWords = 0;
  let entriesThisMonth = 0;

  for (const entry of entries) {
    uniqueDatesSet.add(entry.dateKey);
    totalWords += entry.wordCount || 0;
    if (entry.dateKey.startsWith(currentMonthPrefix)) {
      entriesThisMonth += 1;
    }
  }

  const wroteToday = uniqueDatesSet.has(todayKey);

  // Current streak: start from today if written today, otherwise yesterday (non-pressuring!)
  let currentStreak = 0;
  if (wroteToday || uniqueDatesSet.has(yesterdayKey)) {
    let cursor = wroteToday ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : yesterdayDate;
    while (uniqueDatesSet.has(toLocalDateKey(cursor))) {
      currentStreak += 1;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    }
  }

  // Longest streak across all recorded dates
  const sortedDates = Array.from(uniqueDatesSet).sort();
  let longestStreak = 0;
  let run = 0;
  let prevTime: number | null = null;

  for (const dk of sortedDates) {
    const time = parseDateKey(dk).getTime();
    if (prevTime !== null) {
      const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        run += 1;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevTime = time;
  }

  const lastSevenKeys = getLastNDaysKeys(7, now);
  const lastSevenDays: WeekDayDot[] = lastSevenKeys.map((dk) => {
    const d = parseDateKey(dk);
    return {
      dateKey: dk,
      shortDay: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      hasEntry: uniqueDatesSet.has(dk),
      isToday: dk === todayKey,
    };
  });

  let gentleMessage = 'A quiet table is always waiting when you are ready.';
  if (wroteToday && currentStreak >= 7) {
    gentleMessage = `${currentStreak} unhurried evenings in a row. A steady ritual.`;
  } else if (wroteToday && currentStreak > 1) {
    gentleMessage = `${currentStreak} nights of quiet reflection.`;
  } else if (wroteToday) {
    gentleMessage = 'Tonight’s page is open and saved.';
  } else if (currentStreak > 0) {
    gentleMessage = `${currentStreak}-night rhythm active—write whenever the evening settles.`;
  } else if (entries.length > 0) {
    gentleMessage = 'Welcome back. Every single evening counts on its own.';
  }

  return {
    currentStreak,
    longestStreak,
    wroteToday,
    totalEntries: entries.length,
    entriesThisMonth,
    totalWords,
    lastSevenDays,
    gentleMessage,
  };
}
