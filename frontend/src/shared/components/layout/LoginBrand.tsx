import { toFaDigits } from '@/shared/utils/num';

const PANEL_BACKGROUND = [
  'radial-gradient(ellipse 800px 600px at 30% 20%, rgba(224, 122, 44, 0.10), transparent 60%)',
  'radial-gradient(ellipse 700px 500px at 70% 90%, rgba(138, 162, 194, 0.10), transparent 60%)',
  'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
  'linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
].join(', ');

const STATS = [
  { label: 'پیشرفت برنامه‌ای', value: 72, note: null, noteColor: null },
  { label: 'پیشرفت واقعی', value: 68, note: '۴٪ عقب از برنامه', noteColor: '#FCA5A5' },
  { label: 'گزارش‌های امروز', value: 24, note: '۸٪ بیشتر از دیروز', noteColor: '#86EFAC' },
] as const;

/**
 * پنل برند صفحه‌های ورود — پورت مستقیم آرت‌بورد LoginBrand.
 *
 * نمودار با `preserveAspectRatio="none"` کشیده می‌شود، همان‌طور که در بوم است:
 * اینجا یک تصویر تزئینی است نه نمودار داده‌ای، پس کشیدگی اشکالی ندارد.
 */
export function LoginBrand() {
  return (
    <aside
      style={{
        color: '#FFFFFF',
        width: '100%',
        minHeight: 560,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 32,
        padding: 48,
        backgroundColor: '#0E1E38',
        backgroundImage: PANEL_BACKGROUND,
        backgroundSize: 'auto, auto, 48px 48px, 48px 48px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
        <span
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
          {`${toFaDigits(124)} پروژهٔ فعال روی پروژه‌یار`}
        </span>

        <h2 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.4, margin: '4px 0 0' }}>
          فاصلهٔ میان <span style={{ color: '#F4B17C' }}>برنامه‌ریزی</span> و{' '}
          <span style={{ color: '#F4B17C' }}>کارگاه</span> را از میان بردارید.
        </h2>

        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.8,
            color: 'rgba(255, 255, 255, 0.72)',
            margin: 0,
          }}
        >
          پروژه‌یار مکمل Microsoft Project است؛ گزارش‌های کارگاه را با ساختار WBS و CBS هم‌تراز
          می‌کند تا پیشرفت فیزیکی و مالی پروژه را در یک نگاه ببینید.
        </p>

        <div
          style={{
            marginTop: 16,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div className="row between wrap g12">
            <span style={{ fontSize: 13, fontWeight: 600 }}>منحنی پیشرفت — برج مسکونی الوند</span>
            <span
              style={{
                display: 'inline-flex',
                gap: 14,
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.72)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 0, borderTop: '2px dashed #8AA2C2' }} />
                برنامه‌ای
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: '#E07A2C' }} />
                واقعی
              </span>
            </span>
          </div>

          <svg
            viewBox="0 0 540 200"
            width="100%"
            height="180"
            preserveAspectRatio="none"
            role="img"
            aria-label="منحنی S پیشرفت برنامه‌ای و واقعی؛ واقعی ۴٪ عقب‌تر"
            style={{ display: 'block' }}
          >
            <path d="M0 40H540M0 80H540M0 120H540M0 160H540" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <path
              d="M0,185 C 70,180 130,160 200,120 S 340,40 540,20 L 540,200 L 0,200 Z"
              fill="rgba(138,162,194,0.12)"
            />
            <path
              d="M0,185 C 70,180 130,160 200,120 S 340,40 540,20"
              stroke="#8AA2C2"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 4"
            />
            <path
              d="M0,188 C 60,184 120,170 190,140 S 320,80 410,68 L 410,200 L 0,200 Z"
              fill="rgba(224,122,44,0.18)"
            />
            <path
              d="M0,188 C 60,184 120,170 190,140 S 320,80 410,68"
              stroke="#E07A2C"
              strokeWidth="2.5"
              fill="none"
            />
            <path d="M410 20V200" stroke="rgba(255,255,255,0.28)" strokeDasharray="3 4" />
            <circle cx="410" cy="68" r="5" fill="#E07A2C" stroke="#FFFFFF" strokeWidth="2" />
          </svg>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>{stat.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {stat.label === 'گزارش‌های امروز'
                    ? toFaDigits(stat.value)
                    : `${toFaDigits(stat.value)}٪`}
                </div>
                {stat.note && (
                  <div style={{ fontSize: 11, color: stat.noteColor ?? undefined }}>{stat.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="row between wrap g16"
        style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}
      >
        <span>مکمل Microsoft Project · ساخت ایران</span>
        <span style={{ display: 'inline-flex', gap: 18 }}>
          <a href="/help" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
            دربارهٔ ما
          </a>
          <a href="/help" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
            تماس
          </a>
          <a href="/help" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
            مستندات
          </a>
        </span>
      </div>
    </aside>
  );
}
