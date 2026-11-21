// نام خوانای دستگاه برای «دستگاه‌های فعال» W32 از user-agent. تابع خالص.

const BROWSERS: readonly [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: readonly [RegExp, string][] = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
];

export function deviceName(userAgent: string | null | undefined): string {
  if (!userAgent) return 'مرورگر وب';
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} روی ${system}`;
  return browser ?? system ?? 'مرورگر وب';
}
