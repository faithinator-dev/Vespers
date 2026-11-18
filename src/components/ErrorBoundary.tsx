import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#140e0a] text-[#f3ead8] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#1f1712] border border-[#d99b52]/25 p-8 shadow-2xl">
            <h1 className="font-display text-2xl text-[#f5ecdb] mb-3">
              Something quieted unexpectedly
            </h1>
            <p className="text-sm text-[#c8b9a2] leading-relaxed mb-6">
              Vespers encountered an error while syncing your journal. Your saved entries remain safe.
            </p>
            <p className="text-xs font-mono text-[#8f7e6a] bg-[#140e0a] rounded-xl p-3 mb-6 break-words border border-[#d99b52]/10">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#d99b52] text-[#1a110b] font-semibold text-sm hover:bg-[#e3a862] transition-colors cursor-pointer"
            >
              Reload Journal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
