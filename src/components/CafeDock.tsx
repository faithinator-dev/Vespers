import { useEffect } from 'react';
import { ChevronDown, ChevronUp, Sun, Volume2, VolumeX } from 'lucide-react';
import { CameraPreset } from '../types/journal';

interface CafeDockProps {
  preset: CameraPreset;
  onPresetChange: (preset: CameraPreset) => void;
  lampWarmth: number;
  onLampWarmthChange: (warmth: number) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const PRESETS: { key: CameraPreset; label: string }[] = [
  { key: 'desk', label: 'Desk' },
  { key: 'lamp', label: 'Lamp' },
  { key: 'journal', label: 'Journal' },
  { key: 'window', label: 'Window' },
];

export function CafeDock({
  preset,
  onPresetChange,
  lampWarmth,
  onLampWarmthChange,
  audioEnabled,
  onToggleAudio,
  collapsed,
  onToggleCollapse,
}: CafeDockProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        onToggleCollapse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggleCollapse]);

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 max-w-[min(900px,94vw)] pointer-events-none"
      aria-label="3D café ambience controls"
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1c140f]/94 border border-[#d99b52]/25 text-xs font-medium text-[#e8dbc6] hover:text-[#f8f1e3] hover:border-[#d99b52]/45 transition-colors cursor-pointer"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-[#d99b52]" aria-hidden="true" />
            <span>Show Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-[#d99b52]" aria-hidden="true" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {!collapsed && (
        <div className="pointer-events-auto w-full rounded-2xl bg-[#1c140f]/94 border border-[#d99b52]/22 px-4 py-3 shadow-2xl flex flex-wrap items-center justify-center sm:justify-between gap-4">
          {/* Camera view presets */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#140e0a] border border-[#d99b52]/12">
            {PRESETS.map((p) => {
              const active = preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onPresetChange(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#d99b52] text-[#1a110b] font-semibold'
                      : 'text-[#b9a791] hover:text-[#f3ead8]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Lamp warmth dimmer */}
          <label className="flex items-center gap-3 text-xs text-[#c8b9a2]">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Sun className="w-3.5 h-3.5 text-[#d99b52]" aria-hidden="true" />
              <span>Lamp Glow</span>
            </span>
            <input
              type="range"
              min={0.25}
              max={1.7}
              step={0.05}
              value={lampWarmth}
              onChange={(e) => onLampWarmthChange(parseFloat(e.target.value))}
              aria-label="Adjust brass lamp glow intensity"
              className="w-28 accent-[#d99b52] cursor-pointer"
            />
            <span className="font-mono text-[11px] text-[#9e8d78] tabular-nums w-9 text-right">
              {Math.round(lampWarmth * 100)}%
            </span>
          </label>

          {/* Procedural Rain & Café Audio */}
          <button
            type="button"
            onClick={onToggleAudio}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              audioEnabled
                ? 'bg-[#d99b52]/18 text-[#f5ecdb] border-[#d99b52]/45'
                : 'bg-[#261c16] text-[#b9a791] border-[#d99b52]/15 hover:text-[#f3ead8]'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#d99b52]" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{audioEnabled ? 'Rain Ambience On' : 'Rain Ambience'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
