import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PenLine, Search } from 'lucide-react';
import { JournalEntry, MOODS, MOOD_MAP, MoodKey, MoodLog } from '../types/journal';
import {
  formatReadableDate,
  formatTimeFromMs,
  getMonthGrid,
  getMonthLabel,
  toLocalDateKey,
} from '../utils/dates';
import { MoodIcon } from './MoodIcon';

interface CalendarViewProps {
  entries: JournalEntry[];
  moodLogs: MoodLog[];
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
  onEditEntry: (entry: JournalEntry) => void;
  onWriteForDate: (dateKey: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  entries,
  moodLogs,
  selectedDateKey,
  onSelectDate,
  onEditEntry,
  onWriteForDate,
}: CalendarViewProps) {
  const initialDate = useMemo(() => {
    const [y, m] = selectedDateKey.split('-').map(Number);
    return { year: y || new Date().getFullYear(), month: (m || 1) - 1 };
  }, [selectedDateKey]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<MoodKey | 'all'>('all');

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (moodFilter !== 'all' && entry.mood !== moodFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.plainText.toLowerCase().includes(q)
      );
    });
  }, [entries, searchQuery, moodFilter]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of filteredEntries) {
      const list = map.get(entry.dateKey) || [];
      list.push(entry);
      map.set(entry.dateKey, list);
    }
    return map;
  }, [filteredEntries]);

  const moodLogByDate = useMemo(() => {
    const map = new Map<string, MoodLog>();
    for (const log of moodLogs) {
      map.set(log.dateKey, log);
    }
    return map;
  }, [moodLogs]);

  const cells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(toLocalDateKey(now));
  };

  const selectedEntries = entriesByDate.get(selectedDateKey) || [];
  const selectedMoodLog = moodLogByDate.get(selectedDateKey);

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Mood Filter Strip */}
      <div className="rounded-2xl bg-[#1f1712]/92 border border-[#d99b52]/16 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-[#8f7e6a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search journal titles or lines…"
            aria-label="Search journal entries"
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#150f0b] border border-[#d99b52]/18 text-sm text-[#f3ead8] placeholder:text-[#7c6c5a] focus:border-[#d99b52]/50 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMoodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              moodFilter === 'all'
                ? 'bg-[#d99b52] text-[#1a110b] font-semibold'
                : 'bg-[#17110d] text-[#a89782] hover:text-[#f3ead8]'
            }`}
          >
            All Moods
          </button>
          {MOODS.map((m) => {
            const active = moodFilter === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMoodFilter(m.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#2e231b] text-[#f5ecdb] border border-[#d99b52]/40'
                    : 'bg-[#17110d] text-[#a89782] hover:text-[#f3ead8] border border-transparent'
                }`}
              >
                <span style={{ color: m.accentHex }}>
                  <MoodIcon mood={m.key} className="w-3.5 h-3.5" />
                </span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split: Calendar Grid + Selected Date Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Calendar Card */}
        <section
          aria-label="Journal calendar"
          className="lg:col-span-7 rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/18 p-6 sm:p-7 flex flex-col"
        >
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="font-display text-2xl text-[#f7efe0]">
              {getMonthLabel(viewYear, viewMonth)}
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="px-3 py-1.5 rounded-xl bg-[#271d17] border border-[#d99b52]/18 text-xs font-medium text-[#e8dbc6] hover:border-[#d99b52]/40 transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Previous month"
                className="w-9 h-9 rounded-xl bg-[#271d17] border border-[#d99b52]/18 flex items-center justify-center text-[#e8dbc6] hover:border-[#d99b52]/40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className="w-9 h-9 rounded-xl bg-[#271d17] border border-[#d99b52]/18 flex items-center justify-center text-[#e8dbc6] hover:border-[#d99b52]/40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-[#8f7e6a] py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 flex-1">
            {cells.map((cell) => {
              const dayEntries = entriesByDate.get(cell.dateKey) || [];
              const dayMoodLog = moodLogByDate.get(cell.dateKey);
              const isSelected = cell.dateKey === selectedDateKey;
              const primaryMood = dayEntries[0]?.mood || dayMoodLog?.mood;
              const moodMeta = primaryMood ? MOOD_MAP[primaryMood] : null;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => onSelectDate(cell.dateKey)}
                  className={`min-h-[68px] sm:min-h-[78px] rounded-2xl p-2 flex flex-col justify-between text-left border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2f231a] border-[#d99b52]'
                      : dayEntries.length > 0
                        ? 'bg-[#251b15] border-[#d99b52]/28 hover:border-[#d99b52]/55'
                        : 'bg-[#17110d] border-[#d99b52]/10 hover:border-[#d99b52]/28'
                  } ${!cell.inCurrentMonth ? 'opacity-45' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        cell.isToday
                          ? 'text-[#d99b52] font-semibold'
                          : isSelected
                            ? 'text-[#f8f1e3]'
                            : 'text-[#c8b9a2]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {moodMeta && (
                      <span style={{ color: moodMeta.accentHex }} title={moodMeta.label}>
                        <MoodIcon mood={moodMeta.key} className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {dayEntries.length > 0 ? (
                    <span className="text-[11px] text-[#d99b52] font-mono tabular-nums truncate">
                      {dayEntries.length} {dayEntries.length === 1 ? 'note' : 'notes'}
                    </span>
                  ) : dayMoodLog ? (
                    <span className="text-[11px] text-[#9e8d78] truncate">
                      {MOOD_MAP[dayMoodLog.mood].label}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Date Detail Column */}
        <aside
          aria-label="Entries for selected date"
          className="lg:col-span-5 rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/18 p-6 sm:p-7 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 pb-5 border-b border-[#d99b52]/12">
              <div>
                <p className="text-xs text-[#9e8d78] font-mono tabular-nums mb-1">
                  {selectedDateKey}
                </p>
                <h3 className="font-display text-xl sm:text-2xl text-[#f7efe0]">
                  {formatReadableDate(selectedDateKey)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onWriteForDate(selectedDateKey)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d99b52] text-[#1a110b] text-xs font-semibold hover:bg-[#e5a860] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Write</span>
              </button>
            </div>

            {selectedMoodLog && (
              <div className="mt-5 rounded-2xl bg-[#18120e] border border-[#d99b52]/14 p-4">
                <div className="flex items-center gap-2 text-xs font-medium mb-1">
                  <span style={{ color: MOOD_MAP[selectedMoodLog.mood].accentHex }}>
                    <MoodIcon mood={selectedMoodLog.mood} className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[#f3ead8]">
                    Evening Check-in · {MOOD_MAP[selectedMoodLog.mood].label}
                  </span>
                </div>
                {selectedMoodLog.note && (
                  <p className="text-xs text-[#b9a791] leading-relaxed mt-1">
                    {selectedMoodLog.note}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-4">
              {selectedEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-display text-lg text-[#c8b9a2] mb-2">
                    Quiet page for this date
                  </p>
                  <p className="text-xs text-[#8f7e6a] leading-relaxed max-w-xs mx-auto">
                    No journal entries match this day yet. Click Write to record a memory or evening note.
                  </p>
                </div>
              ) : (
                selectedEntries.map((entry) => {
                  const moodMeta = MOOD_MAP[entry.mood] || MOOD_MAP.reflective;
                  return (
                    <article
                      key={entry.id}
                      className="rounded-2xl bg-[#18120e] border border-[#d99b52]/15 p-5 hover:border-[#d99b52]/35 transition-colors"
                    >
                      <h4 className="font-display text-lg text-[#f5ecdb] mb-1.5">
                        {entry.title || 'Untitled Evening'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#9e8d78] mb-3">
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: moodMeta.accentHex }}
                        >
                          <MoodIcon mood={entry.mood} className="w-3.5 h-3.5" />
                          <span>{moodMeta.label}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {entry.wordCount} words
                        </span>
                        {entry.createdAtMs > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatTimeFromMs(entry.createdAtMs)}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-[#c8b9a2] leading-relaxed line-clamp-4 mb-4">
                        {entry.plainText || 'No body text yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditEntry(entry)}
                        className="text-xs font-medium text-[#d99b52] hover:text-[#ecc083] transition-colors cursor-pointer"
                      >
                        Open in Writing Desk →
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
