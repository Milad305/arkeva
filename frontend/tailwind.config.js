/** @type {import('tailwindcss').Config} */
// آینهٔ توکن‌های دیزاین سیستم پروژه‌یار.
//
// منبع حقیقت: src/shared/styles/tokens.css (export شده از بوم طراحی).
// این فایل همان مقادیر را برای utility‌های Tailwind در دسترس می‌گذارد.
// هر تغییر پالت اول در بوم انجام شود، بعد tokens.css دوباره export شود، بعد اینجا.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      // ── مقیاس تایپوگرافی بوم ──
      // [size, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        display: ['28px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'title-1': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'title-2': ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'title-3': ['17px', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '700' }],
        heading: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        subheading: ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['13.5px', { lineHeight: '1.7' }],
        ui: ['13px', { lineHeight: '1.3', fontWeight: '500' }],
        'body-sm': ['12.5px', { lineHeight: '1.6' }],
        caption: ['11.5px', { lineHeight: '1.5' }],
        label: ['10.5px', { lineHeight: '1.4', letterSpacing: '0.06em', fontWeight: '600' }],
        kpi: ['32px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        stat: ['22px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }],
        'num-inline': ['14px', { lineHeight: '1.2', fontWeight: '700' }],
        code: ['11.5px', { lineHeight: '1.4' }],
        kbd: ['10.5px', { lineHeight: '1.2', fontWeight: '500' }],
      },

      colors: {
        // Primary — آبی سرمه‌ای برندی
        primary: {
          100: '#E5EBF3',
          300: '#8AA2C2',
          500: '#2C4A73',
          700: '#1A3354',
          900: '#0E1E38',
        },
        // Accent — نارنجی گرم (CTA)
        accent: {
          100: '#FCEAD9',
          300: '#F4B17C',
          500: '#E07A2C',
          700: '#B45813',
          900: '#74380A',
        },
        success: { 50: '#ECFDF3', 100: '#D1FADF', 500: '#16A34A', 700: '#15803D' },
        warning: { 50: '#FFF8EB', 100: '#FEF0C7', 500: '#D97706', 700: '#B45309' },
        error: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#DC2626', 700: '#B91C1C' },
        info: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#2563EB', 700: '#1D4ED8' },
        violet: { 50: '#F3EEFE', 500: '#7C3AED', 700: '#6D28D9' },
        cyan: { 50: '#ECFEFF', 500: '#0891B2', 700: '#0E7490' },
        gray: {
          0: '#FFFFFF',
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
        },

        // ── نوع هزینهٔ CBS (۶ مقدار) ──
        cost: {
          material: '#2563EB',
          labor: '#E07A2C',
          equip: '#16A34A',
          sub: '#7C3AED',
          overhead: '#71717A',
          transport: '#0891B2',
        },

        // ── سری‌های نمودار ──
        chart: {
          baseline: '#8AA2C2',
          revised: '#2C4A73',
          actual: '#1A3354',
          forecast: '#A1A1AA',
          today: '#DC2626',
          pv: '#2563EB',
          ev: '#16A34A',
          ac: '#DC2626',
          grid: '#F4F4F5',
        },

        // ── سطوح ویژه ──
        surface: {
          row: '#F5F8FC',
          dropzone: '#F8FAFD',
          approved: '#FDFFFE',
          rejected: '#FFFAFA',
          danger: '#FFFBFB',
        },
      },

      borderRadius: {
        xs: '2px',
        sm: '4px',
        smp: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '999px',
      },

      boxShadow: {
        sm: '0 1px 2px 0 rgb(24 24 27 / 0.04)',
        DEFAULT: '0 1px 3px 0 rgb(24 24 27 / 0.06), 0 1px 2px -1px rgb(24 24 27 / 0.04)',
        md: '0 4px 8px -2px rgb(24 24 27 / 0.06), 0 2px 4px -2px rgb(24 24 27 / 0.04)',
        lg: '0 10px 20px -5px rgb(24 24 27 / 0.08), 0 4px 8px -4px rgb(24 24 27 / 0.04)',
        xl: '0 20px 32px -8px rgb(24 24 27 / 0.10), 0 8px 16px -6px rgb(24 24 27 / 0.04)',
        modal: '0 24px 48px -12px rgb(24 24 27 / 0.22), 0 8px 20px -8px rgb(24 24 27 / 0.12)',
        menu: '0 12px 28px -6px rgb(24 24 27 / 0.12), 0 4px 10px -4px rgb(24 24 27 / 0.07)',
        halo: '0 0 0 3px rgb(44 74 115 / 0.12)',
        'halo-error': '0 0 0 3px rgb(220 38 38 / 0.10)',
        ring: '0 0 0 2px #FFFFFF, 0 0 0 4px #2C4A73',
      },

      // ── ابعاد چیدمان ──
      // تنها حد عرض مجاز در کل اپ: content.
      // هیچ عرض ثابتی روی صفحه گذاشته نمی‌شود — این‌ها فقط برای پنل‌ها و کنترل‌هاست.
      spacing: {
        sidebar: '224px',
        topbar: '52px',
        'panel-toolbar': '280px',
        'panel-detail': '380px',
        'settings-nav': '240px',
      },
      maxWidth: {
        content: '1480px',
        'modal-sm': '420px',
        'modal-md': '600px',
        'modal-lg': '820px',
        'settings-col': '760px',
      },
      height: {
        'ctl-xs': '24px',
        'ctl-sm': '28px',
        'ctl-compact': '30px',
        'ctl-md': '36px',
        field: '38px',
        'ctl-lg': '44px',
        btn: '34px',
        topbar: '52px',
      },

      zIndex: {
        sticky: '20',
        topbar: '30',
        dropdown: '40',
        tooltip: '50',
        modal: '100',
        lightbox: '200',
        toast: '300',
        shortcuts: '400',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
