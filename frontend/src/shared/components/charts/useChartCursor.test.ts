import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChartCursor } from './useChartCursor';

/** نشانگر نمودارها (`features/charts.md` ۶.۱ — تعامل W21). */

// چهار تاریخ با فاصلهٔ برابر روی محور ۱۰۰۰ واحدی
const XS = [50, 360, 670, 980];
const VIEW_W = 1000;

const pointerAt = (clientX: number) =>
  ({
    clientX,
    currentTarget: { getBoundingClientRect: () => ({ left: 0, width: VIEW_W }) },
  }) as unknown as React.PointerEvent<SVGSVGElement>;

const keyOf = (key: string) =>
  ({ key, preventDefault: () => {} }) as unknown as React.KeyboardEvent<SVGSVGElement>;

describe('نشانگر نمودار', () => {
  it('charts ۶.۱ — نزدیک‌ترین تاریخ به موس انتخاب می‌شود، نه تاریخ زیر آن', () => {
    const { result } = renderHook(() => useChartCursor(XS, VIEW_W));

    act(() => result.current.svgProps.onPointerMove(pointerAt(300)));
    expect(result.current.index).toBe(1);

    // درست وسط دو نقطه: نقطهٔ اول برنده است (اولین کمینه)
    act(() => result.current.svgProps.onPointerMove(pointerAt(205)));
    expect(result.current.index).toBe(0);

    act(() => result.current.svgProps.onPointerMove(pointerAt(10_000)));
    expect(result.current.index).toBe(3);
  });

  it('charts ۶.۱ — بیرون رفتن موس نشانگر را پاک می‌کند', () => {
    const { result } = renderHook(() => useChartCursor(XS, VIEW_W));

    act(() => result.current.svgProps.onPointerMove(pointerAt(300)));
    act(() => result.current.svgProps.onPointerLeave());
    expect(result.current.index).toBeNull();
  });

  it('CLAUDE.md ۵ — محور زمان چپ‌به‌راست: فلش راست جلو می‌رود و از دو سر رد نمی‌شود', () => {
    const { result } = renderHook(() => useChartCursor(XS, VIEW_W));

    act(() => result.current.svgProps.onKeyDown(keyOf('ArrowRight')));
    expect(result.current.index).toBe(0);

    act(() => result.current.svgProps.onKeyDown(keyOf('ArrowRight')));
    expect(result.current.index).toBe(1);

    act(() => result.current.svgProps.onKeyDown(keyOf('ArrowLeft')));
    act(() => result.current.svgProps.onKeyDown(keyOf('ArrowLeft')));
    expect(result.current.index).toBe(0);

    act(() => result.current.svgProps.onKeyDown(keyOf('End')));
    expect(result.current.index).toBe(3);

    act(() => result.current.svgProps.onKeyDown(keyOf('ArrowRight')));
    expect(result.current.index).toBe(3);

    act(() => result.current.svgProps.onKeyDown(keyOf('Home')));
    expect(result.current.index).toBe(0);

    act(() => result.current.svgProps.onKeyDown(keyOf('Escape')));
    expect(result.current.index).toBeNull();
  });

  it('charts ۶.۱ — نمودار بدون نقطه نشانگر نمی‌گیرد', () => {
    const { result } = renderHook(() => useChartCursor([], VIEW_W));

    act(() => result.current.svgProps.onPointerMove(pointerAt(300)));
    act(() => result.current.svgProps.onKeyDown(keyOf('ArrowRight')));
    expect(result.current.index).toBeNull();
  });
});
