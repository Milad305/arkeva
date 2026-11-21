import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface Photo {
  id: string;
  /** نشانی تصویر؛ نبودش ← جای‌گزین راه‌راه. */
  url?: string;
  /** متن جایگزین — توصیف کار انجام‌شده. */
  alt: string;
  /** مهر زمان یا مکان روی گوشهٔ تصویر. */
  tag?: string;
}

export interface PhotoThumbProps {
  photo: Photo;
  width?: number | string;
  /** «+۲» روی آخرین تصویر وقتی تعداد بیشتری هست. */
  moreCount?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * بندانگشتی عکس گزارش — `.photo` در kit.css.
 * وقتی `url` نیست، همان جای‌گزین راه‌راه بوم نشان داده می‌شود.
 */
export function PhotoThumb({ photo, width = 64, moreCount, onClick, className }: PhotoThumbProps) {
  const content = (
    <>
      {photo.url ? (
        <img
          src={photo.url}
          alt={photo.alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Icon name="image" size={16} label={photo.alt} />
      )}
      {photo.tag && <span className="tag">{photo.tag}</span>}
      {moreCount !== undefined && moreCount > 0 && (
        <span className="tag">{`+${toFaDigits(moreCount)}`}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn('photo', className)}
        style={{ width }}
        onClick={onClick}
        aria-label={`بزرگ‌نمایی: ${photo.alt}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={cn('photo', className)} style={{ width }}>
      {content}
    </span>
  );
}

export interface LightboxProps {
  photos: Photo[];
  /** اندیس عکس باز؛ `null` یعنی بسته. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** نمایش بزرگ عکس‌ها با پیمایش فلش و بستن با Escape. */
export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(index !== null);
    if (index === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      // در RTL فلش چپ یعنی «بعدی»
      if (event.key === 'ArrowLeft') onNavigate(Math.min(photos.length - 1, index! + 1));
      if (event.key === 'ArrowRight') onNavigate(Math.max(0, index! - 1));
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [index, photos.length, onClose, onNavigate]);

  if (index === null || !isReady) return null;
  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div
      className="pj"
      dir="rtl"
      lang="fa"
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="row between" style={{ padding: '12px 16px' }}>
        <span className="t-13 tx-w">
          {`${toFaDigits(index + 1)} از ${toFaDigits(photos.length)} · ${photo.alt}`}
        </span>
        <IconButton icon="x" label="بستن" onClick={onClose} className="tx-w" />
      </div>

      <div className="row jc grow" style={{ padding: 24, minHeight: 0 }}>
        {photo.url ? (
          <img
            src={photo.url}
            alt={photo.alt}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span className="photo" style={{ width: 'min(720px, 90%)', aspectRatio: '4 / 3' }}>
            <Icon name="image" size={48} label={photo.alt} />
          </span>
        )}
      </div>

      <div className="row jc g8" style={{ padding: 16 }}>
        <IconButton
          icon="chevron-right"
          label="عکس قبلی"
          bordered
          disabled={index === 0}
          onClick={() => onNavigate(index - 1)}
        />
        <IconButton
          icon="chevron-left"
          label="عکس بعدی"
          bordered
          disabled={index === photos.length - 1}
          onClick={() => onNavigate(index + 1)}
        />
      </div>
    </div>,
    document.body,
  );
}
