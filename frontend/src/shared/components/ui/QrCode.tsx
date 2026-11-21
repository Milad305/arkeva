import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

export interface QrCodeProps {
  /** متن QR (لاتین). */
  value: string;
  /** ضلع به پیکسل. */
  size?: number;
  /** برچسب دسترس‌پذیری. */
  label: string;
}

/**
 * QR به‌صورت SVG در مرورگر (بی شبکه). ماژول تیره همیشه سیاه روی سفید است تا در حالت تیره هم خوانا بماند؛
 * حاشیهٔ آرام ۴ ماژول (استاندارد QR).
 */
export function QrCode({ value, size = 200, label }: QrCodeProps) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const parts: string[] = [];
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) parts.push(`M${col + 4} ${row + 4}h1v1h-1z`);
      }
    }
    return { d: parts.join(''), box: count + 8 };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${path.box} ${path.box}`}
      shapeRendering="crispEdges"
      style={{ background: '#fff', borderRadius: 8, display: 'block' }}
    >
      <path d={path.d} fill="#000" />
    </svg>
  );
}
