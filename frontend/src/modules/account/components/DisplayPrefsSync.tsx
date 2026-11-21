import { useEffect } from 'react';

import { setDisplayPrefs } from '@/shared/utils/displayPrefs';
import { useGetAccountQuery } from '../api/accountApi';

/**
 * ترجیحات نمایش کاربر (W32) را پس از ورود روی قالب‌بندی مرکزی می‌نشاند — ارقام، تقویم و
 * واحد مبالغ در `num.ts` و `date.ts` (C03، اصلاح 1405/08/19). کنار `AppShell` در مسیرها.
 */
export function DisplayPrefsSync() {
  const { data } = useGetAccountQuery();
  const preferences = data?.preferences;
  useEffect(() => {
    if (preferences) setDisplayPrefs({ calendar: preferences.calendar, digits: preferences.digits, amountScale: preferences.amountScale });
  }, [preferences]);
  return null;
}
