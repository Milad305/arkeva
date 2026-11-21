import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { useAppDispatch } from '@/app/store';
import { setCredentials, setOrganizations } from '@/app/store/authSlice';

// بازنویسی کامل مطابق designs/Login.html.
// این صفحه استایل مخصوص خودش را دارد (دکمه 44px، فیلد 42px، و غیره)
// که با کامپوننت‌های عمومی متفاوت است — پس استایل‌ها inline طراحی شده‌اند.

// ────────── State‌های صفحه ──────────
type LoginState = 'normal' | 'loading' | 'error' | 'otp';

// ────────── Schema ──────────
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'نام کاربری یا شماره موبایل الزامی است')
    .transform((v) => v.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [state, setState] = useState<LoginState>('normal');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(38);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  // شمارش معکوس OTP
  useEffect(() => {
    if (state !== 'otp' || otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [state, otpTimer]);

  // ورودی OTP — مدیریت خودکار focus
  const handleOtpChange = (idx: number, value: string) => {
    const digit = value.replace(/[^۰-۹0-9]/g, '').slice(-1);
    const normalized = digit.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const next = [...otp];
    next[idx] = normalized;
    setOtp(next);
    if (normalized && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const onSubmit = (data: LoginFormData) => {
    void data;
    // شبیه‌سازی: ابتدا loading، بعد error را نشان می‌دهیم (برای دمو)
    setState('loading');
    setTimeout(() => setState('error'), 1500);
    // TODO: اتصال به API واقعی در فاز auth
  };

  // ورود به‌صورت نمایشی — برای دیدن صفحات تا زمان آماده‌شدن بک‌اند.
  // وقتی بک‌اند وصل شد، این دکمه حذف می‌شود.
  const loginDemo = () => {
    dispatch(
      setCredentials({
        user: {
          id: 1,
          username: 'a.ahmadi',
          fullName: 'مهندس احمدی',
          mobile: '09121234567',
          email: 'ahmadi@abadgaran.ir',
          avatarUrl: null,
        },
        accessToken: 'demo-token-not-real',
      }),
    );
    dispatch(
      setOrganizations([{ id: 1, name: 'شرکت آبادگران ایران', role: 'owner' }]),
    );
    navigate('/dashboard');
  };

  const goOtp = () => {
    setOtpTimer(38);
    setState('otp');
  };

  const faDigit = (n: number | string) =>
    String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] min-h-screen">
      {/* ════════ سمت راست (فرم) — اول در DOM برای RTL ════════ */}
      <section
        className="bg-white flex flex-col p-8 lg:px-12 relative"
        dir="rtl"
      >
        {/* Topbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-lg bg-primary-700 text-white flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21V5a2 2 0 0 1 2-2h7l5 5v13" />
                <path d="M9 12h6" />
                <path d="M9 16h6" />
              </svg>
              {/* accent dot گوشه */}
              <span className="absolute right-1.5 bottom-1.5 w-2 h-2 bg-accent-500 rounded-sm" />
            </div>
            <div className="flex flex-col leading-tight">
              <strong className="text-[15px] font-bold text-gray-900">پروژه‌یار</strong>
              <small className="text-[11px] text-gray-500">مدیریت پیشرفت پروژه‌های عمرانی</small>
            </div>
          </div>
          <div className="hidden sm:inline-flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
            <span>
              سرور: تهران — نسخه <span className="mono">۱.۰.۰</span>
            </span>
          </div>
        </div>

        {/* بدنه فرم */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-[400px]">
            {/* ───── STATE: OTP (back link + header جدا) ───── */}
            {state === 'otp' ? (
              <>
                <button
                  onClick={() => setState('normal')}
                  className="inline-flex items-center gap-1.5 text-[13px] text-gray-600 mb-5 hover:text-gray-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  بازگشت به ورود
                </button>
                <header className="mb-7">
                  <div className="inline-flex items-center gap-2 text-[11px] font-medium text-accent-700 mb-3">
                    <span className="w-6 h-px bg-accent-300" />
                    <span>مرحله ۲ از ۲ · احراز هویت دومرحله‌ای</span>
                  </div>
                  <h1 className="text-[28px] font-bold tracking-tight text-gray-900 mb-1.5">
                    کد تأیید را وارد کنید
                  </h1>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    کد ۶ رقمی به شمارهٔ{' '}
                    <span className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-700 px-2.5 py-1 rounded-sm text-xs font-medium">
                      <Phone className="w-3 h-3" />
                      <span className="mono">۰۹۱۲ *** ۴۳۲۱</span>
                    </span>{' '}
                    ارسال شد.
                  </p>
                </header>

                <form onSubmit={(e) => e.preventDefault()}>
                  <label className="block text-[13px] font-medium text-gray-800 mb-2.5">
                    کد ۶ رقمی
                  </label>
                  <div className="grid grid-cols-6 gap-2 mb-5" dir="ltr">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        value={d ? faDigit(d) : ''}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKey(i, e)}
                        maxLength={1}
                        autoFocus={i === 0}
                        className={`h-13 w-full text-center rounded-md border bg-white outline-none transition-all font-mono text-[22px] font-semibold text-gray-900 ${
                          d
                            ? 'border-primary-700 bg-primary-100 text-primary-900'
                            : 'border-gray-300'
                        } focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15`}
                        style={{ height: '52px' }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[13px] mb-5">
                    <span className="text-gray-600">
                      {otpTimer > 0 ? (
                        <>
                          ارسال مجدد تا <span className="mono text-gray-900 font-semibold">{faDigit(String(Math.floor(otpTimer / 60)).padStart(2, '0'))}:{faDigit(String(otpTimer % 60).padStart(2, '0'))}</span>
                        </>
                      ) : (
                        <span className="opacity-0">.</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={otpTimer > 0}
                      onClick={() => setOtpTimer(38)}
                      className={`font-medium ${otpTimer > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-primary-700 cursor-pointer hover:text-primary-900 hover:underline'}`}
                    >
                      ارسال مجدد کد
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-md bg-primary-700 text-white text-[14.5px] font-semibold hover:bg-primary-900 transition-colors"
                  >
                    تأیید و ورود
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <p className="text-center text-[12.5px] text-gray-500 mt-4 leading-relaxed">
                    کد را دریافت نکردید؟{' '}
                    <a href="#" className="text-primary-700 font-medium">پشتیبانی</a>
                  </p>
                </form>
              </>
            ) : (
              <>
                {/* ───── Header (همان برای normal/loading/error) ───── */}
                <header className="mb-7">
                  <div className="inline-flex items-center gap-2 text-[11px] font-medium text-accent-700 mb-3">
                    <span className="w-6 h-px bg-accent-300" />
                    <span>پنل وب · پروژه‌یار</span>
                  </div>
                  <h1 className="text-[28px] font-bold tracking-tight text-gray-900 mb-1.5">
                    ورود به سیستم
                  </h1>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    حساب کاربری خود را وارد کنید تا به پروژه‌هایتان دسترسی داشته باشید.
                  </p>
                </header>

                {/* Alert خطا (فقط در حالت error) */}
                {state === 'error' && (
                  <div className="flex gap-2.5 px-3 py-2.5 rounded-md border border-error-500/25 bg-error-50 text-error-700 mb-4 text-[13px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">نام کاربری یا رمز عبور اشتباه است</div>
                      <div className="text-error-700/90 text-xs mt-0.5">
                        ۲ تلاش دیگر تا قفل موقت حساب باقی مانده است. در صورت فراموشی، گزینهٔ بازیابی را انتخاب کنید.
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* username */}
                  <div className="mb-4">
                    <label className="block text-[13px] font-medium text-gray-800 mb-1.5">
                      نام کاربری یا شماره موبایل
                    </label>
                    <input
                      {...register('username')}
                      disabled={state === 'loading'}
                      placeholder="مثلاً a.karimi یا ۰۹۱۲۳۴۵۶۷۸۹"
                      autoComplete="username"
                      className="w-full h-[42px] px-3.5 rounded-md border border-gray-300 bg-white text-gray-900 text-sm font-sans outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:opacity-60"
                    />
                  </div>

                  {/* password */}
                  <div className="mb-4">
                    <label className="block text-[13px] font-medium text-gray-800 mb-1.5">
                      رمز عبور
                    </label>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        disabled={state === 'loading'}
                        placeholder="••••••••••"
                        autoComplete="current-password"
                        className={`w-full h-[42px] pl-10 pr-3.5 rounded-md border bg-white text-gray-900 text-sm font-sans outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:opacity-60 ${
                          state === 'error' ? 'border-error-500 focus:ring-error-500/10' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={state === 'loading'}
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        aria-label={showPassword ? 'مخفی‌کردن رمز' : 'نمایش رمز'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* helper خطا در حالت error */}
                    {state === 'error' && (
                      <p className="mt-1.5 text-xs text-error-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        این رمز عبور با حساب وارد شده مطابقت ندارد.
                      </p>
                    )}
                  </div>

                  {/* row: remember + forgot */}
                  <div className="flex items-center justify-between my-1 mb-5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <button
                        type="button"
                        onClick={() => setRemember((r) => !r)}
                        disabled={state === 'loading'}
                        className={`w-[18px] h-[18px] rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                          remember
                            ? 'bg-primary-700 border-primary-700'
                            : 'bg-white border-gray-300'
                        } disabled:opacity-60`}
                      >
                        {remember && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5 9-11" />
                          </svg>
                        )}
                      </button>
                      <span className="text-[13px] text-gray-700">مرا به خاطر بسپار</span>
                    </label>
                    <a
                      href="#"
                      className={`text-[13px] text-primary-700 font-medium hover:text-primary-900 hover:underline ${state === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      فراموشی رمز عبور؟
                    </a>
                  </div>

                  {/* دکمه ورود */}
                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    onClick={(e) => {
                      if (state === 'error') {
                        e.preventDefault();
                        setState('normal');
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-md bg-primary-700 text-white text-[14.5px] font-semibold hover:bg-primary-900 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {state === 'loading' ? (
                      <>
                        <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        در حال احراز هویت…
                      </>
                    ) : state === 'error' ? (
                      <>
                        تلاش مجدد
                        <ArrowLeft className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        ورود به سیستم
                        <ArrowLeft className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* divider */}
                <div className="flex items-center gap-3 my-5 text-gray-400 text-xs">
                  <span className="flex-1 h-px bg-gray-200" />
                  یا
                  <span className="flex-1 h-px bg-gray-200" />
                </div>

                {/* SSO */}
                <button
                  type="button"
                  disabled={state === 'loading'}
                  onClick={goOtp}
                  className={`inline-flex items-center justify-center gap-2 w-full h-11 rounded-md bg-transparent text-gray-700 text-[14.5px] font-medium hover:bg-gray-100 hover:text-gray-900 border border-gray-200 transition-colors ${state === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Lock className="w-4 h-4" />
                  ورود با شناسه سازمانی (SSO)
                </button>

                {/* دکمه demo برای دیدن حالت OTP */}
                <button
                  type="button"
                  onClick={goOtp}
                  className="mt-3 text-xs text-gray-400 hover:text-primary-700 w-full text-center"
                >
                  (دمو: مشاهده مرحله OTP)
                </button>

                {/* ─── ورود نمایشی (تا آماده‌شدن بک‌اند) ─── */}
                <div className="mt-6 pt-5 border-t border-dashed border-gray-200">
                  <button
                    type="button"
                    onClick={loginDemo}
                    className="w-full h-11 rounded-md bg-accent-500 text-white text-[14.5px] font-semibold hover:bg-accent-700 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    ورود نمایشی (داده‌های نمونه)
                  </button>
                  <p className="text-center text-[11px] text-gray-400 mt-2">
                    برای مشاهدهٔ صفحات بدون بک‌اند
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 pt-4">
          <div>©۱۴۰۴ پروژه‌یار. تمامی حقوق محفوظ است.</div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="#" className="text-gray-600 hover:text-gray-900">قوانین استفاده</a>
            <span className="text-gray-300">·</span>
            <a href="#" className="text-gray-600 hover:text-gray-900">حریم خصوصی</a>
            <span className="text-gray-300">·</span>
            <a href="#" className="text-gray-600 hover:text-gray-900">پشتیبانی</a>
          </div>
        </footer>
      </section>

      {/* ════════ سمت چپ (گرافیک) ════════ */}
      <aside
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: '#0E1E38' }}
      >
        {/* پس‌زمینه: gradient‌های radial */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 800px 600px at 30% 20%, rgba(224, 122, 44, 0.10), transparent 60%), radial-gradient(ellipse 700px 500px at 70% 90%, rgba(138, 162, 194, 0.10), transparent 60%), #0E1E38',
          }}
        />
        {/* الگوی grid lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          }}
        />

        <div className="relative z-10 flex flex-col h-full">
          <div>
            {/* pill با pulse */}
            <div className="inline-flex items-center gap-1.5 text-xs mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.06] text-white/85">
                <span className="relative w-1.5 h-1.5 rounded-full bg-success-500">
                  <span className="absolute inset-[-3px] rounded-full bg-success-500 opacity-30 animate-ping" />
                </span>
                ۱۲۴ پروژه فعال در حال اجرا
              </span>
            </div>

            {/* headline */}
            <h2 className="text-[30px] font-bold leading-snug tracking-tight mt-4 mb-3 max-w-[480px]">
              فاصلهٔ میان{' '}
              <em className="not-italic text-accent-300 font-bold">برنامه‌ریزی</em> و{' '}
              <em className="not-italic text-accent-300 font-bold">کارگاه</em> را از میان بردارید.
            </h2>
            <p className="text-[14.5px] leading-relaxed text-white/70 max-w-[460px]">
              پروژه‌یار مکمل Microsoft Project است؛ گزارش‌گیری فیلد را با ساختار WBS و CBS هم‌تراز
              می‌کند تا پیشرفت فیزیکی و مالی پروژه را در یک نگاه ببینید.
            </p>

            {/* کارت نمودار S-Curve */}
            <div className="mt-8 bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 backdrop-blur-sm max-w-[540px]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-semibold text-white">منحنی پیشرفت پروژه — برج الوند</div>
                <div className="flex gap-3.5 text-[11px] text-white/70">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 rounded-sm" style={{ background: '#8AA2C2' }} />
                    برنامه‌ای
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 rounded-sm bg-accent-500" />
                    واقعی
                  </span>
                </div>
              </div>

              <svg viewBox="0 0 540 200" width="100%" height="auto" preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* grid */}
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                  <line x1="0" y1="40" x2="540" y2="40" />
                  <line x1="0" y1="80" x2="540" y2="80" />
                  <line x1="0" y1="120" x2="540" y2="120" />
                  <line x1="0" y1="160" x2="540" y2="160" />
                </g>
                <defs>
                  <linearGradient id="planFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8AA2C2" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#8AA2C2" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E07A2C" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#E07A2C" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* planned */}
                <path d="M0,185 C 70,180 130,160 200,120 S 340,40 540,20 L 540,200 L 0,200 Z" fill="url(#planFill)" />
                <path d="M0,185 C 70,180 130,160 200,120 S 340,40 540,20" stroke="#8AA2C2" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                {/* actual */}
                <path d="M0,188 C 60,184 120,170 190,140 S 320,80 410,68 L 410,200 L 0,200 Z" fill="url(#actFill)" />
                <path d="M0,188 C 60,184 120,170 190,140 S 320,80 410,68" stroke="#E07A2C" strokeWidth="2.5" fill="none" />
                {/* today marker */}
                <line x1="410" y1="20" x2="410" y2="200" stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />
                <circle cx="410" cy="68" r="5" fill="#E07A2C" stroke="white" strokeWidth="2" />
                <text x="410" y="14" fill="rgba(255,255,255,0.7)" fontSize="10" textAnchor="middle" fontFamily="Vazirmatn">
                  امروز
                </text>
                {/* ماه‌های شمسی */}
                <g fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="Vazirmatn" textAnchor="middle">
                  <text x="40" y="195">فروردین</text>
                  <text x="135" y="195">اردیبهشت</text>
                  <text x="230" y="195">خرداد</text>
                  <text x="325" y="195">تیر</text>
                  <text x="420" y="195">مرداد</text>
                  <text x="500" y="195">شهریور</text>
                </g>
              </svg>

              {/* ۳ stat card */}
              <div className="grid grid-cols-3 gap-2.5 mt-3.5">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-2.5">
                  <div className="text-[10.5px] text-white/55 mb-1 tracking-wide">پیشرفت برنامه‌ای</div>
                  <div className="text-lg font-bold text-white leading-tight">۷۲٪</div>
                  <div className="text-[10.5px] mt-1 inline-flex items-center gap-0.5 text-accent-300">طبق برنامه</div>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-2.5">
                  <div className="text-[10.5px] text-white/55 mb-1 tracking-wide">پیشرفت واقعی</div>
                  <div className="text-lg font-bold text-white leading-tight">۶۸٪</div>
                  <div className="text-[10.5px] mt-1 inline-flex items-center gap-0.5 text-[#FCA5A5]">۴٪ تأخیر</div>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-2.5">
                  <div className="text-[10.5px] text-white/55 mb-1 tracking-wide">گزارش امروز</div>
                  <div className="text-lg font-bold text-white leading-tight">۲۴</div>
                  <div className="text-[10.5px] mt-1 inline-flex items-center gap-0.5 text-success-500">۸٪ نسبت به دیروز</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* footer گرافیک */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/45">
          <span>مکمل Microsoft Project · ساخت ایران</span>
          <div className="flex gap-4.5">
            <a href="#" className="hover:text-white">دربارهٔ ما</a>
            <a href="#" className="hover:text-white">تماس</a>
            <a href="#" className="hover:text-white">مستندات</a>
          </div>
        </div>
      </aside>
    </div>
  );
}
