import { useState } from 'react';
import { Link } from 'react-router-dom';

import { FIELD_REPORT_ITEM_STATUS, FIELD_REPORT_ITEM_STATUS_TONES } from '@/config/constants';
import { WBS_DEEP_LINKS, ROUTES } from '@/config/routes';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Kbd } from '@/shared/components/ui/Kbd';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { Lightbox, PhotoThumb } from '@/shared/components/ui/PhotoThumb';
import { formatRelativeTime } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { cn } from '@/shared/utils/cn';
import type { ItemDialogKind } from '../hooks/useItemDecisions';
import { deltaTone, quantityText, signedPercent, STATUS_HINT, toPhotos } from '../services/reportView';
import type { FieldItemDto } from '../types';

const PRIMARY_FLAG_SKIP = new Set(['photos_pending']);

/**
 * کارت یک آیتم در W20: درصد قبلی ← جدید و تغییر، مقدار، پرچم‌ها با شرح سرور، توضیح سرپرست،
 * عکس‌ها و نوار تصمیم با میانبر. کلیک روی عنوان یا عکس W40 را باز می‌کند.
 */
export function FieldItemCard({
  item,
  active,
  busy,
  onActivate,
  onOpenQuick,
  onApprove,
  onDialog,
}: {
  item: FieldItemDto;
  active: boolean;
  busy: boolean;
  onActivate: () => void;
  onOpenQuick: () => void;
  onApprove: () => void;
  onDialog: (kind: ItemDialogKind) => void;
}) {
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photos = toPhotos(item.photos);
  const warn = item.flags.some((flag) => !PRIMARY_FLAG_SKIP.has(flag));
  const tone = deltaTone(item);
  const qty = quantityText(item);
  const lastNote = [...item.reviews].reverse().find((review) => review.note && review.decision && review.decision !== 'escalate');

  const menu: MenuEntry[] = [
    ...(item.can.revokeAuto ? [{ key: 'revoke', label: 'برگرداندن تأیید خودکار', icon: 'undo-2' as const, onSelect: () => onDialog('revoke') }] : []),
    ...(item.can.correct ? [{ key: 'correct', label: 'اصلاح آیتم تأییدشده', icon: 'file-pen-line' as const, onSelect: () => onDialog('correct') }] : []),
    { key: 'wbs', label: 'مشاهده در WBS', icon: 'list-tree' as const, to: ROUTES.wbsItem(item.projectId, item.wbsItemId) },
    { key: 'risks', label: 'ریسک‌های این فعالیت', icon: 'shield-alert' as const, to: WBS_DEEP_LINKS.risks(item.projectId, item.wbsItemId) },
  ];

  return (
    <div
      className={cn('card', active && 'sel-card')}
      style={{ borderColor: active ? '#2C4A73' : warn && item.can.decide ? '#F4B17C' : undefined }}
      // هر دکمه‌ای داخل کارت که فوکوس بگیرد، کارت را «فعال» می‌کند (میانبرهای A/E/R)
      onFocus={onActivate}
    >
      <div className="row g10 ai-st wrap" style={{ padding: '12px 14px' }}>
        <span className="col g6 grow" style={{ minWidth: 220 }}>
          <span className="row wrap g6">
            <span className="mono t-sm tx5">{item.wbsCode}</span>
            <button type="button" className="t-13 fw6 tx9" style={{ textAlign: 'start' }} onClick={onOpenQuick}>
              {item.wbsTitle}
            </button>
            <Badge size="sm" tone={FIELD_REPORT_ITEM_STATUS_TONES[item.status]}>
              {item.status === 'approved' && item.autoApproved ? 'تأیید خودکار' : (STATUS_HINT[item.status] ?? FIELD_REPORT_ITEM_STATUS[item.status])}
            </Badge>
            {item.requiresStage2 && item.status === 'stage1' && (
              <Badge size="sm" tone="inf">
                نیاز مرحلهٔ دوم
              </Badge>
            )}
            {item.revisionCount > 0 && (
              <Badge size="sm" tone="neu">
                ارسال دوباره ({toFaDigits(item.revisionCount)})
              </Badge>
            )}
            {item.supersedesItemId && (
              <Badge size="sm" tone="neu">
                اصلاحی
              </Badge>
            )}
          </span>
          <span className="row wrap g10 t-12 tx7">
            <span className="row g6">
              <span className="tx5">{formatPercentAuto(item.lastApprovedPercent)}</span>
              <Icon name="arrow-left" size={12} />
              <strong className={tone === 'ok' ? 'tx-ok' : 'tx-wrn'}>{formatPercentAuto(item.computedPercent)}</strong>
              <Badge size="sm" tone={tone}>
                {signedPercent(item.deltaPercent)}
              </Badge>
            </span>
            {qty && <span>{qty}</span>}
            <span className="tx5">برنامه {formatPercentAuto(item.plannedPercentAtDate)}</span>
            {item.crewCount != null && <span className="tx5">{toFaDigits(item.crewCount)} نفر</span>}
          </span>
          {item.flagMessages.map((message) => (
            <span key={message} className="row g6 t-12 tx-wrn ai-st">
              <Icon name="alert-triangle" size={12} />
              <span className="lh">{message}</span>
            </span>
          ))}
          {item.note && <span className="t-12 tx6 lh">{item.note}</span>}
          {lastNote && item.status !== 'stage1' && item.status !== 'stage2' && (
            <span className="t-12 tx7 lh" style={{ background: '#FAFAFA', borderRadius: 6, padding: '6px 8px' }}>
              <span className="fw6">{lastNote.reviewer?.fullName ?? 'سیستم'}: </span>
              {lastNote.note}
              {lastNote.requiredActions?.map((action) => (
                <span key={action.key} className="row g4 t-12 tx6" style={{ marginTop: 2 }}>
                  <Icon name={action.type === 'photo' ? 'camera' : 'check'} size={11} />
                  {action.text}
                  {action.type === 'photo' && action.minPhotos ? ` (${toFaDigits(action.minPhotos)} عکس)` : ''}
                </span>
              ))}
            </span>
          )}
          {item.heldBy && (
            <span className="row g6 t-12 tx6">
              <Icon name="user-check" size={12} />
              نویسنده شما هستید؛ نزد {item.heldBy.fullName}
            </span>
          )}
          {item.overdue && item.dueAt && (
            <span className="row g6 t-12 tx-err">
              <Icon name="clock" size={12} />
              مهلت بررسی {formatRelativeTime(item.dueAt)} گذشت
            </span>
          )}
        </span>
        {photos.length > 0 ? (
          <span className="row g6" style={{ flex: '0 0 auto' }}>
            {photos.slice(0, 2).map((photo, index) => (
              <PhotoThumb key={photo.id} photo={photo} width={64} moreCount={index === 1 ? photos.length - 2 : undefined} onClick={() => setPhotoIndex(index)} />
            ))}
          </span>
        ) : (
          <span className="t-12 tx5 row g4">
            <Icon name="camera" size={12} />
            بدون عکس
          </span>
        )}
      </div>

      <div className="row wrap g6" style={{ padding: '8px 14px', borderTop: '1px solid #F4F4F5', background: '#FAFAFA' }}>
        {item.can.decide && (
          <>
            <AppButton size="xs" variant="success" icon="check" loading={busy} onClick={onApprove}>
              {item.status === 'stage2' ? 'تأیید نهایی' : 'تأیید'}
              {active && <Kbd onDark>A</Kbd>}
            </AppButton>
            <AppButton size="xs" variant="outline" className="tx-wrn" icon="pencil" onClick={() => onDialog('request_revision')}>
              درخواست اصلاح
              {active && <Kbd>E</Kbd>}
            </AppButton>
            <AppButton size="xs" variant="dangerOutline" icon="x" onClick={() => onDialog('reject')}>
              رد
              {active && <Kbd>R</Kbd>}
            </AppButton>
          </>
        )}
        {item.can.resolve && (
          <AppButton size="xs" variant="primary" icon="git-compare-arrows" onClick={() => onDialog('resolve')}>
            تعیین تکلیف
          </AppButton>
        )}
        <Link className="btn btn-g btn-xs ms-auto" to={ROUTES.wbsItem(item.projectId, item.wbsItemId)}>
          مشاهده در WBS
        </Link>
        <Menu entries={menu} trigger={(props) => <IconButton {...props} icon="more-vertical" label={`بیشتر برای ${item.wbsCode}`} size="sm" />} />
      </div>
      <Lightbox photos={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onNavigate={setPhotoIndex} />
    </div>
  );
}
