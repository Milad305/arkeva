// QR دعوت اپ کارگاه (OD-20؛ field-app.md ۷). قالب باید با اپ (`InviteCode.normalize`) و بک‌اند (`normalizeInviteCode`) یکی بماند.

/** محتوای QR که اپ کارگاه می‌خواند. */
export const inviteQrValue = (code: string): string => `projeyar:invite:${code}`;

/** نمایش خوانا: `K7M2-Q9XA`؛ اپ خط تیره را نادیده می‌گیرد. */
export const groupInviteCode = (code: string): string => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);
