import { v7 as uuidv7 } from 'uuid';

/** UUID v7 (ترتیب زمانی، ایندکس فشرده) — شناسهٔ ساخت سرور (C01؛ docs/backend/05 ۳). */
export function newId(): string {
  return uuidv7();
}
