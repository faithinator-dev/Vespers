import { Coffee, Compass } from 'lucide-react';

interface AuthGateProps {
  onSignIn: () => void;
  onExploreCafe: () => void;
  isSigningIn: boolean;
  errorMessage: string | null;
}

export function AuthGate({
  onSignIn,
  onExploreCafe,
  isSigningIn,
  errorMessage,
}: AuthGateProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-5 py-12">
      <div className="max-w-lg w-full rounded-3xl bg-[#1c140f]/94 border border-[#d99b52]/22 p-8 sm:p-10 shadow-2xl">
        <div className="flex items-center gap-2 text-xs text-[#d99b52] font-medium mb-4">
          <Coffee className="w-4 h-4" aria-hidden="true" />
          <span>Late-Night Café Journal</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl text-[#f7efe0] leading-tight mb-4 [text-wrap:balance]">
          A warm corner table for your evening thoughts.
        </h1>

        <p className="text-sm sm:text-base text-[#c8b9a2] leading-relaxed mb-7">
          Settle in beside the amber lamp. Write freely in a distraction-free rich-text page, trace how your moods shift across quiet nights, and keep a gentle writing rhythm across every device.
        </p>

        {errorMessage && (
          <div className="mb-5 rounded-xl bg-[#40201a] border border-[#c97b63]/40 px-4 py-3 text-xs text-[#f2c8bc]">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isSigningIn}
            onClick={onSignIn}
            className="px-6 py-3 rounded-xl bg-[#d99b52] text-[#1a110b] text-sm font-semibold hover:bg-[#e6aa63] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSigningIn ? 'Opening your journal…' : 'Continue with Google'}
          </button>

          <button
            type="button"
            onClick={onExploreCafe}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#271d17] text-[#e8dbc6] text-sm font-medium border border-[#d99b52]/20 hover:border-[#d99b52]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#d99b52]" aria-hidden="true" />
            <span>Explore 3D Café</span>
          </button>
        </div>

        <p className="mt-6 text-xs text-[#8f7e6a]">
          Private by default · Entries and mood logs are stored exclusively under your account.
        </p>
      </div>
    </div>
  );
}
