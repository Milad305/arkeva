/**
 * خروجی تصویری از نمودارهای درون‌خطی (منوی نمودار W45).
 *
 * نمودارها SVG واقعی‌اند، پس خروجی از خود همان گره گرفته می‌شود: SVG با
 * سریال‌سازی و PNG با رسم روی canvas. هیچ کتابخانه‌ای لازم نیست و هیچ داده‌ای
 * جایی فرستاده نمی‌شود.
 */

const FONT_FAMILY = "'Vazirmatn', 'Tahoma', sans-serif";

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * نسخهٔ مستقل SVG: اندازهٔ واقعی، پس‌زمینهٔ سفید و فونت درون‌خطی تا بیرون از اپ
 * هم درست دیده شود.
 */
function standalone(svg: SVGSVGElement): { markup: string; width: number; height: number } {
  const box = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.style.fontFamily = FONT_FAMILY;
  clone.style.background = '#FFFFFF';
  clone.setAttribute('direction', 'rtl');

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#FFFFFF');
  clone.insertBefore(background, clone.firstChild);

  return { markup: new XMLSerializer().serializeToString(clone), width, height };
}

export function downloadChartSvg(svg: SVGSVGElement, fileName: string): void {
  const { markup } = standalone(svg);
  download(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}.svg`);
}

/**
 * PNG با دو برابر چگالی برای نمایشگرهای رتینا. اگر مرورگر نتواند SVG را رسم کند
 * (مثلاً فونت خارجی)، خطا برمی‌گردد تا صدازننده پیام بدهد.
 */
export function downloadChartPng(svg: SVGSVGElement, fileName: string, scale = 2): Promise<void> {
  const { markup, width, height } = standalone(svg);
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('مرورگر از ساخت تصویر پشتیبانی نمی‌کند.'));
        return;
      }
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('تصویر ساخته نشد.'));
          return;
        }
        download(blob, `${fileName}.png`);
        resolve();
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('نمودار برای ساخت تصویر خوانده نشد.'));
    image.src = source;
  });
}

/** نمای تمام‌صفحهٔ یک قاب نمودار؛ کلید F یا گزینهٔ منو. */
export async function toggleFullscreen(element: HTMLElement): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await element.requestFullscreen();
}
