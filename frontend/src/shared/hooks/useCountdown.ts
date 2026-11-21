import { useCallback, useEffect, useRef, useState } from 'react';

export interface Countdown {
  /** ثانیه‌های باقی‌مانده. */
  remaining: number;
  /** `mm:ss` با ارقام لاتین — برای نمایش مونواسپیس. */
  formatted: string;
  isFinished: boolean;
  restart: (seconds?: number) => void;
}

function format(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * شمارش معکوس ثانیه‌ای.
 * برای «ارسال دوباره تا ۰۰:۳۸» در W03 و مهلت‌های مشابه.
 */
export function useCountdown(initialSeconds: number): Countdown {
  const [remaining, setRemaining] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining <= 0) return;

    intervalRef.current = setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [remaining]);

  const restart = useCallback(
    (seconds?: number) => setRemaining(seconds ?? initialSeconds),
    [initialSeconds],
  );

  return { remaining, formatted: format(remaining), isFinished: remaining <= 0, restart };
}
