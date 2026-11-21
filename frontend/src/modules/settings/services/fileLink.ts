/**
 * دانلود از لینک امضاشدهٔ سرور (یا `data:` در نسخهٔ نمایشی) بی ترک صفحه. لینک دیسک نسبی است (`/v1/files/content?token=`) و
 * لینک S3 مطلق؛ هر دو Content-Disposition: attachment دارند.
 */
export function openFileLink(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
