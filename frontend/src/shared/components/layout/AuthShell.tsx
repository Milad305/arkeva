import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Icon } from '@/shared/components/ui/Icon';
import { BrandMark } from './BrandMark';
import { LoginBrand } from './LoginBrand';

export interface AuthShellProps {
  /** سمت مقابل نشان برند در سر صفحه؛ وضعیت سرور یا پیوند بازگشت. */
  headerAside?: ReactNode;
  /** پانویس؛ پیش‌فرض کپی‌رایت و سه پیوند. */
  footer?: ReactNode;
  /** عرض ستون فرم؛ W01 و W03 چهارصد، W04 چهارصد و بیست. */
  formWidth?: number;
  children: ReactNode;
}

/**
 * پوستهٔ صفحه‌های ورود — W01 تا W04.
 *
 * دو ستون با `flex-wrap`: فرم `flex: 1 1 520px` و پنل برند `flex: 1.05 1 560px`.
 * در عرض کم پنل برند زیر فرم می‌افتد و هیچ‌چیز بریده نمی‌شود.
 */
export function AuthShell({ headerAside, footer, formWidth = 400, children }: AuthShellProps) {
  return (
    <div
      className="pj"
      dir="rtl"
      lang="fa"
      style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh', background: '#FFFFFF' }}
    >
      <section
        style={{
          flex: '1 1 520px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px clamp(20px, 5vw, 48px)',
          background: '#FFFFFF',
        }}
      >
        <div className="row between wrap g16">
          <Link to={ROUTES.login} className="row g10">
            <BrandMark size="lg" />
            <div className="brand-t">
              <strong style={{ fontSize: 15 }}>پروژه‌یار</strong>
              <small>مدیریت پیشرفت پروژه‌های عمرانی</small>
            </div>
          </Link>
          {headerAside ?? <ServerBadge />}
        </div>

        <div
          style={{
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 0',
          }}
        >
          <div style={{ width: '100%', maxWidth: formWidth }}>{children}</div>
        </div>

        {footer ?? <AuthFooter />}
      </section>

      <div style={{ flex: '1.05 1 560px', minWidth: 0, display: 'flex', background: '#0E1E38' }}>
        <LoginBrand />
      </div>
    </div>
  );
}

/** «سرور تهران · نسخهٔ 1.0.0» با نقطهٔ سبز. */
export function ServerBadge() {
  return (
    <span className="row g8 t-12 tx6">
      <span className="dot" style={{ color: '#16A34A' }} />
      سرور تهران · نسخهٔ <span className="mono">1.0.0</span>
    </span>
  );
}

/** پیوند «بازگشت به ورود». */
export function BackToLogin() {
  return (
    <Link className="row g6 t-ui tx6" to={ROUTES.login}>
      <Icon name="arrow-right" size={14} />
      بازگشت به ورود
    </Link>
  );
}

export function AuthFooter({ compact }: { compact?: boolean } = {}) {
  return (
    <footer className="col g8" style={{ alignItems: 'center', fontSize: 12, color: '#71717A' }}>
      <span>©۱۴۰۴ پروژه‌یار. تمامی حقوق محفوظ است.</span>
      {!compact && (
        <span className="row g16 wrap jc">
          <Link to={ROUTES.help} className="tx6">
            قوانین استفاده
          </Link>
          <Link to={ROUTES.help} className="tx6">
            حریم خصوصی
          </Link>
          <Link to={ROUTES.help} className="tx6">
            پشتیبانی
          </Link>
        </span>
      )}
    </footer>
  );
}
