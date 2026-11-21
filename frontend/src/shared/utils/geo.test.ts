import { describe, expect, it } from 'vitest';

import {
  bearingBetween,
  compassLabel,
  destinationPoint,
  distanceBetween,
  formatLatLng,
  neshanPointUrl,
} from './geo';

/** مهر مکان گزارش کارگاه (`features/field-app.md` ۶؛ `02-domain-model.md` ۶). */

const SITE = { lat: 35.7219, lng: 51.3347 };

describe('مهر مکان گزارش', () => {
  it('field-app ۶ — نقطهٔ ساخته‌شده همان فاصله و جهت را پس می‌دهد', () => {
    for (const bearing of [0, 45, 120, 270, 359]) {
      const point = destinationPoint(SITE, 450, bearing);

      expect(distanceBetween(SITE, point)).toBeCloseTo(450, 0);
      expect(bearingBetween(SITE, point)).toBeCloseTo(bearing, 1);
    }
  });

  it('field-app ۶ — نقطهٔ بیرون از شعاع، بیرون می‌ماند و داخلی داخل', () => {
    const radiusM = 300;

    expect(distanceBetween(SITE, destinationPoint(SITE, 450, 30))).toBeGreaterThan(radiusM);
    expect(distanceBetween(SITE, destinationPoint(SITE, 120, 30))).toBeLessThan(radiusM);
  });

  it('field-app ۶ — شمال بالا: جهت ۰ عرض را زیاد می‌کند و ۹۰ طول را', () => {
    const north = destinationPoint(SITE, 500, 0);
    const east = destinationPoint(SITE, 500, 90);

    expect(north.lat).toBeGreaterThan(SITE.lat);
    expect(north.lng).toBeCloseTo(SITE.lng, 5);
    expect(east.lng).toBeGreaterThan(SITE.lng);
    expect(east.lat).toBeCloseTo(SITE.lat, 5);
  });

  it('۳.۵.۲۸ — مختصات با شش رقم و لاتین نوشته می‌شود و پیوند نشان همان را می‌برد', () => {
    expect(formatLatLng(SITE)).toBe('35.721900, 51.334700');
    expect(neshanPointUrl(SITE)).toBe('https://neshan.org/maps/@35.7219,51.3347,17z');
  });

  it('۳.۵.۲۸ — جهت فارسی از همان زاویه ساخته می‌شود', () => {
    expect(compassLabel(0)).toBe('شمال');
    expect(compassLabel(90)).toBe('شرق');
    expect(compassLabel(200)).toBe('جنوب');
    expect(compassLabel(225)).toBe('جنوب‌غربی');
    expect(compassLabel(359)).toBe('شمال');
  });
});
