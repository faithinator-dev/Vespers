import { Flame, LogOut } from 'lucide-react';
import { StreakSummary } from '../utils/streak';

interface StreakRibbonProps {
  streak: StreakSummary;
  userName: string;
  onSignOut: () => void;
  onSelectDate?: (dateKey: string) => void;
}

export function StreakRibbon({
  streak,
  userName,
  onSignOut,
  onSelectDate,
}: StreakRibbonProps) {
  return (
    <div className="rounded-2xl bg-[#1f1712]/90 border border-[#d99b52]/16 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-[#f3ead8]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#e5a860] tabular-nums">
            <Flame className="w-4 h-4" aria-hidden="true" />
            {streak.currentStreak}{' '}
            {streak.currentStreak === 1 ? 'night' : 'nights'}
          </span>
          <span className="text-[#6d5d4d]" aria-hidden="true">
            ·
          </span>
          <span className="text-[#c8b9a2] tabular-nums">
            {streak.entriesThisMonth} this month
          </span>
          <span className="text-[#6d5d4d]" aria-hidden="true">
            ·
          </span>
          <span className="text-[#9e8d78] tabular-nums">
            Best {streak.longestStreak}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#a89782]">{streak.gentleMessage}</p>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
        {/* 7-day unhurried rhythm */}
        <div className="flex items-center gap-2" aria-label="Past 7 evenings writing rhythm">
          {streak.lastSevenDays.map((day) => (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate?.(day.dateKey)}
              title={`${day.dateKey}${day.hasEntry ? ' — Entry recorded' : ''}`}
              className={`w-7 h-9 rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                day.hasEntry
                  ? 'bg-[#d99b52]/20 text-[#f3ead8] border border-[#d99b52]/40'
                  : day.isToday
                    ? 'bg-[#2a1f18] text-[#d99b52] border border-[#d99b52]/30'
                    : 'bg-[#18120e] text-[#7c6c5a] border border-[#d99b52]/10 hover:border-[#d99b52]/25'
              }`}
            >
              <span>{day.shortDay}</span>
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${
                  day.hasEntry
                    ? 'bg-[#d99b52]'
                    : day.isToday
                      ? 'bg-[#8f7e6a]'
                      : 'bg-transparent'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-[#d99b52]/15 hidden sm:block" aria-hidden="true" />

        <div className="flex items-center gap-2.5 text-xs text-[#a89782]">
          <span className="max-w-[120px] truncate hidden sm:inline">{userName}</span>
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#b9a791] hover:text-[#f3ead8] hover:bg-[#2b2019] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
