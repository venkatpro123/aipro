import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  tabLabel: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryKey: number;  // incrementing this key forces a full remount of children
}

export class TabErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[TabErrorBoundary] ${this.props.tabLabel} tab crashed:`, error, errorInfo);
  }

  handleReload = () => {
    // Increment retryKey to force a full remount of children — this ensures
    // the broken component is destroyed and re-constructed from scratch rather
    // than just un-hiding the same broken instance (which would crash again).
    this.setState(prev => ({ hasError: false, error: undefined, retryKey: prev.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl p-6 my-4 flex flex-col items-start gap-4"
          style={{
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.25)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(220,38,38,0.15)' }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-red-400">
                {this.props.tabLabel} tab encountered an error
              </p>
              <p className="text-[11px] text-[var(--alpha-text-35)] mt-0.5">
                Other tabs are unaffected and fully functional.
              </p>
            </div>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <pre
              className="w-full text-[10px] font-mono rounded-lg p-3 overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(248,113,113,0.8)' }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.30)',
              color: 'rgba(252,165,165,0.9)',
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry this section
          </button>
        </div>
      );
    }

    // Use retryKey as the React key so incrementing it forces a full child remount.
    return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
  }
}
