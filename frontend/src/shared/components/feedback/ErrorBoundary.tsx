import { Component, type ErrorInfo, type ReactNode } from 'react';

import { isDev } from '@/config/env';
import { AppButton } from '@/shared/components/ui/AppButton';
import { EmptyState } from './EmptyState';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** جای‌گزین سفارشی — برای ویجت‌های سنگین مثل نمودار و جدول. */
  fallback?: ReactNode;
  /** کلید بازنشانی؛ با تغییرش مرز خطا پاک می‌شود (مثلاً مسیر صفحه). */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** کد کوتاه برای گفتن به پشتیبانی — مطابق W46. */
  traceId: string | null;
}

/**
 * مرز خطای رندر.
 *
 * خطای API کار listenerMiddleware است؛ این فقط خطای رندر را می‌گیرد.
 * تنها کامپوننت کلاسی پروژه — جای دیگری کلاس ننویس.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, traceId: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const traceId = `ERR-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
      .toString(36)
      .slice(-2)
      .toUpperCase()}`;
    return { error, traceId };
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null, traceId: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isDev) {
      console.error('ErrorBoundary:', error, info.componentStack);
    }
    // در تولید اینجا به سرویس گزارش خطا فرستاده می‌شود.
  }

  private reset = () => this.setState({ error: null, traceId: null });

  render(): ReactNode {
    const { error, traceId } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback;

    return (
      <EmptyState
        inCard
        icon="server"
        iconStyle={{ background: 'var(--error-100, #FEE2E2)', color: 'var(--error-700)' }}
        title="بارگذاری این بخش انجام نشد"
        description="مشکل از سمت ماست و داده‌های شما سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
        footnote={
          traceId && (
            <>
              {'کد پیگیری: '}
              <span className="mono">{traceId}</span>
            </>
          )
        }
        actions={
          <>
            <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={this.reset}>
              تلاش دوباره
            </AppButton>
            <AppButton variant="outline" size="sm" onClick={() => window.location.reload()}>
              بازخوانی صفحه
            </AppButton>
          </>
        }
      />
    );
  }
}
