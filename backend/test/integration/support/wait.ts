// انتظار برای کار پس‌زمینه (کارگرهای pg-boss) با سقف زمانی. برای مهلت‌های دامنه از FixedClock استفاده
// می‌شود، نه از این؛ این فقط برای رسیدن کار ناهمگام واقعی است.

export async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 20_000, intervalMs = 100): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`شرط در ${timeoutMs} میلی‌ثانیه برقرار نشد`);
}
