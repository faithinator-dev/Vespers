import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  JournalEntry,
  MOODS,
  MOOD_MAP,
  MoodKey,
  MoodLog,
  SCHEMA_LIMITS,
} from '../types/journal';
import { formatShortDate, getLastNDaysKeys, toLocalDateKey } from '../utils/dates';
import { MoodIcon } from './MoodIcon';

const MOOD_SCORES: Record<MoodKey, number> = {
  serene: 5,
  inspired: 4,
  reflective: 3,
  melancholy: 2,
  restless: 1,
};

const SCORE_LABELS: Record<number, string> = {
  5: 'Serene',
  4: 'Inspired',
  3: 'Reflective',
  2: 'Melancholy',
  1: 'Restless',
};

interface TrendDatum {
  dateKey: string;
  label: string;
  score: number | null;
  mood: MoodKey | null;
  source: string | null;
  note?: string;
}

interface MoodTooltipProps {
  active?: boolean;
  payload?: { payload?: TrendDatum }[];
}

function MoodTrendTooltip({ active, payload }: MoodTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  const meta = datum.mood ? MOOD_MAP[datum.mood] : null;

  return (
    <div className="rounded-xl bg-[#16100c] border border-[#d99b52]/30 px-3.5 py-2.5 shadow-xl max-w-[240px]">
      <div className="text-[11px] font-mono tabular-nums text-[#9e8d78] mb-1">
        {formatShortDate(datum.dateKey)}
      </div>
      {meta ? (
        <>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#f5ecdb]">
            <span style={{ color: meta.accentHex }}>
              <MoodIcon mood={meta.key} className="w-3.5 h-3.5" />
            </span>
            <span>{meta.label}</span>
          </div>
          {datum.source && (
            <div className="text-[11px] text-[#b9a791] mt-1 truncate">
              {datum.source}
            </div>
          )}
          {datum.note && (
            <div className="text-[11px] text-[#9e8d78] mt-1 line-clamp-2">
              {datum.note}
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-[#7c6c5a]">No mood recorded</div>
      )}
    </div>
  );
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: TrendDatum;
}

function renderMoodDot({ cx, cy, payload }: CustomDotProps) {
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    !payload ||
    !payload.mood ||
    payload.score === null
  ) {
    return <g key={payload?.dateKey || `empty_${cx}_${cy}`} />;
  }
  const color = MOOD_MAP[payload.mood].accentHex;
  return (
    <circle
      key={payload.dateKey}
      cx={cx}
      cy={cy}
      r={4.5}
      fill={color}
      stroke="#1f1712"
      strokeWidth={1.75}
    />
  );
}

interface MoodTrackerProps {
  entries: JournalEntry[];
  moodLogs: MoodLog[];
  onSaveMoodLog: (
    dateKey: string,
    mood: MoodKey,
    note: string,
    existsAlready: boolean,
  ) => Promise<void>;
  onOpenEntry: (entry: JournalEntry) => void;
}

export function MoodTracker({
  entries,
  moodLogs,
  onSaveMoodLog,
  onOpenEntry,
}: MoodTrackerProps) {
  const todayKey = toLocalDateKey(new Date());
  const [checkInDate, setCheckInDate] = useState(todayKey);

  const existingLog = useMemo(
    () => moodLogs.find((l) => l.dateKey === checkInDate),
    [moodLogs, checkInDate],
  );

  const [selectedMood, setSelectedMood] = useState<MoodKey>('serene');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [filterMood, setFilterMood] = useState<MoodKey | 'all'>('all');

  useEffect(() => {
    if (existingLog) {
      setSelectedMood(existingLog.mood);
      setNote(existingLog.note);
    } else {
      setSelectedMood('serene');
      setNote('');
    }
    setSavedToast(false);
  }, [existingLog, checkInDate]);

  // Combine moodLogs and latest entry mood per day for a rich 30-day timeline
  const moodByDate = useMemo(() => {
    const map = new Map<string, { mood: MoodKey; source: string; note?: string }>();
    for (const e of entries) {
      if (!map.has(e.dateKey)) {
        map.set(e.dateKey, {
          mood: e.mood,
          source: e.title || 'Journal Entry',
        });
      }
    }
    for (const log of moodLogs) {
      map.set(log.dateKey, {
        mood: log.mood,
        source: 'Evening Check-in',
        note: log.note,
      });
    }
    return map;
  }, [entries, moodLogs]);

  const last30Keys = useMemo(() => getLastNDaysKeys(30, new Date()), []);

  const trendData = useMemo<TrendDatum[]>(() => {
    return last30Keys.map((dk) => {
      const record = moodByDate.get(dk);
      return {
        dateKey: dk,
        label: formatShortDate(dk),
        score: record ? MOOD_SCORES[record.mood] : null,
        mood: record ? record.mood : null,
        source: record ? record.source : null,
        note: record?.note,
      };
    });
  }, [last30Keys, moodByDate]);

  const loggedLast30Count = useMemo(
    () => trendData.filter((d) => d.score !== null).length,
    [trendData],
  );

  const distribution = useMemo(() => {
    const counts: Record<MoodKey, number> = {
      serene: 0,
      reflective: 0,
      inspired: 0,
      melancholy: 0,
      restless: 0,
    };
    const seenDates = new Set<string>();
    for (const log of moodLogs) {
      counts[log.mood] += 1;
      seenDates.add(log.dateKey);
    }
    for (const entry of entries) {
      if (!seenDates.has(entry.dateKey)) {
        counts[entry.mood] += 1;
        seenDates.add(entry.dateKey);
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [entries, moodLogs]);

  const filteredEntries = useMemo(() => {
    if (filterMood === 'all') return entries.slice(0, 8);
    return entries.filter((e) => e.mood === filterMood).slice(0, 8);
  }, [entries, filterMood]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveMoodLog(checkInDate, selectedMood, note, Boolean(existingLog));
      setSavedToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Split: Evening Check-In + 30-Day Mood Rhythm */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Quick Evening Check-in */}
        <section
          aria-label="Evening mood check-in"
          className="lg:col-span-5 rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/18 p-6 sm:p-7 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-2xl text-[#f7efe0]">
                Evening Check-In
              </h2>
              <input
                type="date"
                value={checkInDate}
                max={todayKey}
                onChange={(e) => setCheckInDate(e.target.value)}
                aria-label="Mood check-in date"
                className="px-3 py-1.5 rounded-xl bg-[#150f0b] border border-[#d99b52]/18 text-xs font-mono tabular-nums text-[#e8dbc6] cursor-pointer"
              />
            </div>

            <p className="text-sm text-[#b9a791] leading-relaxed mb-5">
              Even on nights you do not feel like writing a full page, notice how the evening feels.
            </p>

            <div className="grid grid-cols-1 gap-2.5 mb-5">
              {MOODS.map((m) => {
                const active = selectedMood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => {
                      setSelectedMood(m.key);
                      setSavedToast(false);
                    }}
                    style={
                      active
                        ? {
                            backgroundColor: m.softBg,
                            borderColor: m.borderHex,
                          }
                        : undefined
                    }
                    className={`w-full rounded-2xl px-4 py-3 border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      active
                        ? ''
                        : 'bg-[#17110d] border-[#d99b52]/12 hover:border-[#d99b52]/28'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span style={{ color: m.accentHex }}>
                        <MoodIcon mood={m.key} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#f5ecdb]">
                          {m.label}
                        </div>
                        <div className="text-xs text-[#9e8d78] truncate">
                          {m.description}
                        </div>
                      </div>
                    </div>
                    {active && (
                      <Check
                        className="w-4 h-4 text-[#f5ecdb] shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <textarea
              value={note}
              maxLength={SCHEMA_LIMITS.MOOD_NOTE_MAX_LEN}
              onChange={(e) => {
                setNote(e.target.value);
                setSavedToast(false);
              }}
              rows={2}
              placeholder="Optional brief note (e.g., quiet rain after a long afternoon)…"
              aria-label="Mood check-in note"
              className="w-full rounded-xl bg-[#150f0b] border border-[#d99b52]/18 px-3.5 py-2.5 text-sm text-[#f3ead8] placeholder:text-[#7c6c5a] focus:border-[#d99b52]/50 focus:outline-none resize-none"
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs text-[#8fb996]">
              {savedToast ? 'Evening mood recorded.' : ''}
            </span>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-[#d99b52] text-[#1a110b] text-xs sm:text-sm font-semibold hover:bg-[#e5a860] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSaving ? 'Recording…' : existingLog ? 'Update Check-In' : 'Record Mood'}
            </button>
          </div>
        </section>

        {/* 30-Day Mood Rhythm & Breakdown */}
        <section
          aria-label="Mood trends over time"
          className="lg:col-span-7 rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/18 p-6 sm:p-7 flex flex-col justify-between gap-7"
        >
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="font-display text-2xl text-[#f7efe0]">
                30-Night Mood Rhythm
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#9e8d78]">
                {distribution.total} logged {distribution.total === 1 ? 'evening' : 'evenings'}
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2.5 mb-5">
              {last30Keys.map((dk) => {
                const record = moodByDate.get(dk);
                const meta = record ? MOOD_MAP[record.mood] : null;
                const dayNum = dk.slice(8, 10);
                const isSelected = dk === checkInDate;

                return (
                  <button
                    key={dk}
                    type="button"
                    onClick={() => setCheckInDate(dk)}
                    title={
                      meta
                        ? `${formatShortDate(dk)}: ${meta.label} (${record?.source})`
                        : `${formatShortDate(dk)}: No mood logged`
                    }
                    style={
                      meta
                        ? {
                            backgroundColor: meta.softBg,
                            borderColor: isSelected ? '#f5ecdb' : meta.borderHex,
                          }
                        : undefined
                    }
                    className={`h-14 rounded-xl border p-2 flex flex-col items-center justify-between transition-colors cursor-pointer ${
                      meta
                        ? ''
                        : isSelected
                          ? 'bg-[#2a1f18] border-[#d99b52]'
                          : 'bg-[#17110d] border-[#d99b52]/10 hover:border-[#d99b52]/25'
                    }`}
                  >
                    <span className="text-[10px] font-mono tabular-nums text-[#b9a791]">
                      {dayNum}
                    </span>
                    {meta ? (
                      <span style={{ color: meta.accentHex }}>
                        <MoodIcon mood={meta.key} className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#55473a]">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Distribution Bars */}
          <div>
            <h3 className="text-sm font-medium text-[#e8dbc6] mb-3">
              Mood Balance
            </h3>
            <div className="flex flex-col gap-3">
              {MOODS.map((m) => {
                const count = distribution.counts[m.key];
                const pct =
                  distribution.total > 0
                    ? Math.round((count / distribution.total) * 100)
                    : 0;
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <div className="w-28 flex items-center gap-2 text-xs text-[#e8dbc6] shrink-0">
                      <span style={{ color: m.accentHex }}>
                        <MoodIcon mood={m.key} className="w-3.5 h-3.5" />
                      </span>
                      <span>{m.label}</span>
                    </div>
                    <div className="flex-1 h-2.5 rounded-full bg-[#140e0a] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: m.accentHex,
                        }}
                      />
                    </div>
                    <div className="w-20 text-right text-xs font-mono tabular-nums text-[#9e8d78] shrink-0">
                      {count} · {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* 30-Day Mood Trend Line Chart (Recharts) */}
      <section
        aria-label="30-day mood trend line chart"
        className="rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/18 p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
          <div>
            <h3 className="font-display text-xl text-[#f7efe0]">
              30-Day Mood Trend
            </h3>
            <p className="text-xs text-[#9e8d78] mt-1">
              How your evenings have moved between stillness and restlessness over the past month.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#9e8d78]">
            {loggedLast30Count} of 30 nights logged
          </span>
        </div>

        {loggedLast30Count === 0 ? (
          <div className="h-[220px] rounded-2xl bg-[#17110d] border border-[#d99b52]/10 flex items-center justify-center px-6 text-center">
            <p className="text-sm text-[#a89782]">
              Record an evening check-in or save a journal entry to reveal your 30-day mood line.
            </p>
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  stroke="rgba(217, 155, 82, 0.1)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9e8d78', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(217, 155, 82, 0.16)' }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  width={76}
                  tickFormatter={(val: number) => SCORE_LABELS[val] || ''}
                  tick={{ fill: '#c8b9a2', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<MoodTrendTooltip />}
                  cursor={{ stroke: 'rgba(217, 155, 82, 0.25)', strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#d99b52"
                  strokeWidth={2.25}
                  connectNulls
                  dot={renderMoodDot}
                  activeDot={{
                    r: 6,
                    fill: '#f5ecdb',
                    stroke: '#d99b52',
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Matching Reflections List */}
      <section
        aria-label="Reflections by mood"
        className="rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/18 p-6 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h3 className="font-display text-xl text-[#f7efe0]">
            Reflections by Mood
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMood('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterMood === 'all'
                  ? 'bg-[#d99b52] text-[#1a110b] font-semibold'
                  : 'bg-[#17110d] text-[#a89782] hover:text-[#f3ead8]'
              }`}
            >
              All
            </button>
            {MOODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setFilterMood(m.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterMood === m.key
                    ? 'bg-[#2e231b] text-[#f5ecdb] border border-[#d99b52]/40'
                    : 'bg-[#17110d] text-[#a89782] hover:text-[#f3ead8] border border-transparent'
                }`}
              >
                <span style={{ color: m.accentHex }}>
                  <MoodIcon mood={m.key} className="w-3.5 h-3.5" />
                </span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-sm text-[#9e8d78] py-6">
            No journal entries recorded under this mood yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEntries.map((entry) => {
              const meta = MOOD_MAP[entry.mood];
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onOpenEntry(entry)}
                  className="text-left rounded-2xl bg-[#18120e] border border-[#d99b52]/14 p-5 hover:border-[#d99b52]/38 transition-colors cursor-pointer"
                >
                  <div className="font-display text-lg text-[#f5ecdb] truncate mb-1">
                    {entry.title || 'Untitled Evening'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#9e8d78] mb-2">
                    <span className="font-mono tabular-nums">
                      {formatShortDate(entry.dateKey)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ color: meta.accentHex }}
                    >
                      <MoodIcon mood={entry.mood} className="w-3.5 h-3.5" />
                      <span>{meta.label}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {entry.wordCount} words
                    </span>
                  </div>
                  <p className="text-xs text-[#b9a791] line-clamp-2 leading-relaxed">
                    {entry.plainText}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
