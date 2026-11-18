import { AppView } from '../types/journal';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onNewEntry: () => void;
  isAuthenticated: boolean;
  onSignIn: () => void;
}

const NAV_ITEMS: { key: AppView; label: string }[] = [
  { key: 'write', label: 'Write' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'moods', label: 'Moods' },
  { key: 'cafe', label: 'Café View' },
];

export function TopBar({
  activeView,
  onSelectView,
  onNewEntry,
  isAuthenticated,
  onSignIn,
}: TopBarProps) {
  return (
    <header className="relative z-20 w-full border-b border-[#d99b52]/15 bg-[#19120d]/92">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('write')}
          className="font-display text-xl sm:text-2xl tracking-tight text-[#f5ecdb] hover:text-[#d99b52] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Vespers
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectView(item.key)}
                className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-[#f5ecdb]'
                    : 'text-[#a89782] hover:text-[#e8dbc6]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-[#d99b52]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onNewEntry}
              className="px-4 py-2 rounded-xl bg-[#d99b52] text-[#1a110b] text-xs sm:text-sm font-semibold hover:bg-[#e5a860] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              New Entry
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 rounded-xl bg-[#d99b52] text-[#1a110b] text-xs sm:text-sm font-semibold hover:bg-[#e5a860] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
