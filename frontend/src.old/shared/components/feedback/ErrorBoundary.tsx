import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

// مطابق frontend-react.md بخش ۸.
// این تنها class component مجاز در پروژه است.

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // در توسعه کنسول، در production باید به Sentry ارسال شود
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-xl border border-error-500/30 bg-error-50 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-error-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-error-700">خطایی رخ داد</h3>
          <p className="text-sm text-error-700/80 mt-1 max-w-sm mx-auto">
            در نمایش این بخش مشکلی پیش آمد. می‌توانید دوباره تلاش کنید یا صفحه را بازنشانی کنید.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="h-9 px-3.5 rounded-md bg-primary-700 text-white text-sm font-medium hover:bg-primary-900 transition-colors"
            >
              تلاش مجدد
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-9 px-3.5 rounded-md border border-gray-300 bg-white text-gray-800 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              بازنشانی صفحه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
