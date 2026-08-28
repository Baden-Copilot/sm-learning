import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by React Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600 shadow-2xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline text-xl sm:text-2xl font-bold text-slate-900">
                Terjadi Kesalahan pada Halaman
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Aplikasi mengalami kendala saat memuat tampilan. Jangan khawatir, progres dan data pembelajaran Anda tetap aman.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left font-mono text-[11px] text-red-700 overflow-x-auto max-h-32">
                <span className="font-bold text-slate-800 block mb-0.5">Detail Error:</span>
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Coba Lagi</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-600" />
                <span>Kembali ke Beranda</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
