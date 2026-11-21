import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { FIELD_REPORT_ITEM_STATUS } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Kbd } from '@/shared/components/ui/Kbd';
import { Menu } from '@/shared/components/ui/Menu';
import { Modal } from '@/shared/components/ui/Modal';
import { Lightbox, PhotoThumb } from '@/shared/components/ui/PhotoThumb';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { TextArea } from '@/shared/components/ui/TextInput';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatJalaliDateTime, formatRelativeTime } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useDecideItemMutation, useGetFieldReportQuery } from '../api/fieldReportsApi';
import { useItemDecisions } from '../hooks/useItemDecisions';
import { DECISION_LABEL, deltaTone, quantityText, signedPercent, toPhotos } from '../services/reportView';
import type { FieldItemDto, FieldReportDto } from '../types';
import { GpsSketch } from './GpsSketch';

/**
 * W40 — تأیید سریع یک آیتم (approval-workflow.md ۵.۲): درصد قبلی، جدید و تغییر؛ برنامه تا
 * امروز و انحراف پس از تأیید؛ عکس‌ها با مهر زمان و مکان؛ GPS با شعاع کارگاه؛ توضیح سرپرست؛
 * تاریخچهٔ بررسی؛ یادداشت ناظر. از W05، W11 و W20 باز می‌شود (تصمیم 1405/08/15).
 */
export function QuickApproveDialog({ projectId, reportId, itemId, onClose }: { projectId: EntityId; reportId: EntityId; itemId?: EntityId | null; onClose: () => void }) {
  const query = useGetFieldReportQuery({ projectId, reportId });
  const report = query.data;
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!report || index !== null) return;
    const start = report.items.findIndex((item) => item.id === itemId);
    const firstOpen = report.items.findIndex((item) => item.can.decide);
    setIndex(start >= 0 ? start : Math.max(0, firstOpen));
  }, [report, itemId, index]);

  const item = report && index !== null ? report.items[index] : undefined;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={item ? item.wbsTitle : 'تأیید سریع'}
      description={
        report && item ? (
          <>
            گزارش <span className="mono">{report.reportNo}</span> از {report.author.fullName} · {formatRelativeTime(report.serverReceivedAt)} · <span className="mono">{item.wbsCode}</span>
          </>
        ) : undefined
      }
    >
      {query.isLoading || !report || !item || index === null ? (
        query.isError ? (
          <Alert tone="err" icon="alert-octagon">
            {getApiErrorMessage(query.error)}
          </Alert>
        ) : (
          <SkeletonTable rows={5} />
        )
      ) : (
        <QuickBody report={report} item={item} index={index} onIndex={setIndex} onClose={onClose} />
      )}
    </Modal>
  );
}

function QuickBody({ report, item, index, onIndex, onClose }: { report: FieldReportDto; item: FieldItemDto; index: number; onIndex: (index: number) => void; onClose: () => void }) {
  const [decide, decideState] = useDecideItemMutation();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  // پس از تأیید (یا رفتن به مرحلهٔ دوم) آیتم باز بعدی
  const decisions = useItemDecisions(report.projectId, () => advance());
  const photos = toPhotos(item.photos);
  const tone = deltaTone(item);
  const qty = quantityText(item);
  const total = report.items.length;

  useEffect(() => {
    setNote('');
    setNoteError(false);
  }, [item.id]);

  /** پس از تصمیم: آیتم باز بعدی همین گزارش، وگرنه بستن. */
  function advance() {
    const next = report.items.findIndex((entry, position) => position > index && entry.can.decide);
    if (next >= 0) onIndex(next);
    else onClose();
  }

  async function decideWithNote(decision: 'request_revision' | 'reject') {
    if (!note.trim()) {
      setNoteError(true);
      return;
    }
    try {
      await decide({ projectId: report.projectId, itemId: item.id, decision, note }).unwrap();
      toast.success(decision === 'reject' ? 'آیتم رد شد.' : 'برای اصلاح به سرپرست برگشت.');
      advance();
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  async function approve() {
    decisions.approve(item);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return;
      if (decisions.dialogOpen || photoIndex !== null) return;
      if (event.key.toLowerCase() === 'a' && item.can.decide && !event.shiftKey) {
        event.preventDefault();
        void approve();
      } else if (event.key === 'ArrowLeft' && index < total - 1) onIndex(index + 1);
      else if (event.key === 'ArrowRight' && index > 0) onIndex(index - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="col g14">
      <div className="row between wrap g8">
        <span className="row g8">
          <Avatar name={report.author.fullName} tone={report.author.avatarTone ?? 'a1'} size="m" />
          <Badge tone={item.can.decide ? 'inf' : 'neu'}>{FIELD_REPORT_ITEM_STATUS[item.status]}</Badge>
          {item.requiresStage2 && item.status === 'stage1' && <Badge tone="inf">پس از این تأیید، مرحلهٔ دوم</Badge>}
        </span>
        <span className="row g6">
          <span className="t-xs tx5">{`${toFaDigits(index + 1)} از ${toFaDigits(total)} آیتم این گزارش`}</span>
          <IconButton icon="chevron-right" label="آیتم قبلی" size="sm" bordered disabled={index === 0} onClick={() => onIndex(index - 1)} />
          <IconButton icon="chevron-left" label="آیتم بعدی" size="sm" bordered disabled={index >= total - 1} onClick={() => onIndex(index + 1)} />
        </span>
      </div>

      <div className="grid c3" style={{ gap: 10 }}>
        <div className="box col" style={{ gap: 2, background: '#FFFFFF' }}>
          <span className="t-xs tx5">درصد قبلی</span>
          <span className="t-16 fw7 tx7">{formatPercentAuto(item.lastApprovedPercent)}</span>
        </div>
        <div className="box col" style={{ gap: 2, background: '#E5EBF3', borderColor: '#8AA2C2' }}>
          <span className="t-xs tx6">درصد جدید</span>
          <span className="t-16 fw7 tx9">{formatPercentAuto(item.computedPercent)}</span>
        </div>
        <div className="box col" style={{ gap: 2, background: tone === 'ok' ? '#ECFDF3' : '#FFF7ED', borderColor: tone === 'ok' ? '#A7D7B8' : '#F4B17C' }}>
          <span className="t-xs tx6">تغییر</span>
          <span className={`t-16 fw7 ${tone === 'ok' ? 'tx-ok' : 'tx-wrn'}`}>{signedPercent(item.deltaPercent)}</span>
        </div>
      </div>

      <div className="col g4">
        <div className="row between wrap g8 t-12">
          <span className="tx6">
            برنامه تا امروز <strong className="tx9">{formatPercentAuto(item.plannedPercentAtDate)}</strong> · پس از تأیید انحراف به{' '}
            <strong className={item.deviationAfter < 0 ? 'tx-wrn' : 'tx9'}>{signedPercent(item.deviationAfter).replace('+', '')}</strong> می‌رسد
          </span>
          {qty && <span className="tx5">مقدار: {qty}</span>}
        </div>
        <ProgressBar value={item.computedPercent} size="lg" color="#2C4A73" marker={item.plannedPercentAtDate} label="درصد جدید نسبت به برنامه" />
      </div>

      {item.stepsProgress && (
        <div className="col g4">
          {item.stepsProgress.map((step) => (
            <span key={step.key} className="row g8 t-12">
              <span className="grow tx7">{step.title}</span>
              <span className="tx5">{formatPercentAuto(step.fromPercent)}</span>
              <Icon name="arrow-left" size={11} />
              <strong className={step.toPercent !== step.fromPercent ? 'tx-ok' : 'tx7'}>{formatPercentAuto(step.toPercent)}</strong>
            </span>
          ))}
        </div>
      )}

      {item.flagMessages.length > 0 && (
        <Alert tone="wrn" icon="alert-triangle">
          <span className="col g4">
            {item.flagMessages.map((message) => (
              <span key={message}>{message}</span>
            ))}
          </span>
        </Alert>
      )}

      <div className="col g8">
        <span className="t-12 fw6 tx8">
          عکس‌های پیوست <span className="tx5 fw4">({toFaDigits(photos.length)})</span>
        </span>
        {photos.length === 0 ? (
          <span className="t-12 tx5">عکسی پیوست نشده است.</span>
        ) : (
          <div className="grid c3" style={{ gap: 8 }}>
            {photos.map((photo, position) => (
              <span key={photo.id} className="col g4">
                <PhotoThumb photo={photo} width="100%" onClick={() => setPhotoIndex(position)} className={item.photos[position]?.markedUnsuitable ? 'tx-err' : undefined} />
                <span className="t-xs tx6 trunc">{photo.alt}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {item.note && (
        <div className="col g6">
          <span className="t-12 fw6 tx8">توضیحات سرپرست</span>
          <p className="t-13 tx7" style={{ lineHeight: 1.9, background: '#FAFAFA', borderRadius: 8, padding: '10px 12px', margin: 0 }}>
            {item.note}
          </p>
        </div>
      )}

      <div className="row wrap g12 ai-st">
        <GpsSketch distanceM={report.distanceFromSiteM} radiusM={report.siteRadiusM} seed={report.id} />
        <div className="row wrap g8 grow" style={{ alignContent: 'flex-start' }}>
          {report.distanceFromSiteM != null ? (
            <Badge tone={report.distanceFromSiteM > report.siteRadiusM ? 'err' : 'ok'} icon="map-pin">
              {report.distanceFromSiteM > report.siteRadiusM
                ? `${toFaDigits(report.distanceFromSiteM)} متر؛ بیرون از محدوده`
                : `GPS داخل محدودهٔ کارگاه · ${toFaDigits(report.distanceFromSiteM)} متر`}
            </Badge>
          ) : (
            <Badge tone="neu" icon="map-pin">
              ثبت دستی وب؛ بدون GPS
            </Badge>
          )}
          {report.weather && (
            <Badge tone="neu" icon="cloud-sun">
              {report.weather}
              {report.temperatureC != null ? ` · ${toFaDigits(report.temperatureC)} درجه` : ''}
            </Badge>
          )}
          {item.crewCount != null && (
            <Badge tone="neu" icon="users">
              {toFaDigits(item.crewCount)} نفر
            </Badge>
          )}
          {report.appVersion && (
            <Badge tone="neu" icon="smartphone">
              اندروید {toFaDigits(report.appVersion)} · {report.offline ? 'آفلاین' : 'آنلاین'}
            </Badge>
          )}
        </div>
      </div>

      {item.reviews.some((review) => review.decision) && (
        <div className="col g4">
          <span className="t-12 fw6 tx8">تاریخچهٔ بررسی</span>
          {item.reviews
            .filter((review) => review.decision)
            .map((review) => (
              <span key={review.id} className="t-12 tx7 lh">
                <span className="fw6">{review.reviewer?.fullName ?? 'سیستم'}</span> {DECISION_LABEL[review.decision!]}
                {review.escalatedTo ? ` به ${review.escalatedTo.fullName}` : ''} · {formatJalaliDateTime(review.decidedAt)}
                {review.note ? ` — ${review.note}` : ''}
                {review.requiredActions?.map((action) => (
                  <span key={action.key} className="row g4 t-xs tx6">
                    <Icon name={action.type === 'photo' ? 'camera' : 'check'} size={11} />
                    {action.text}
                    {action.type === 'photo' && action.minPhotos ? ` (${toFaDigits(action.minPhotos)} عکس)` : ''}
                  </span>
                ))}
              </span>
            ))}
        </div>
      )}

      {item.can.decide ? (
        <div className="fg">
          <label className="lbl t-12" htmlFor="quick-note">
            یادداشت ناظر <span className="opt">(برای برگشت و رد لازم است)</span>
          </label>
          <TextArea id="quick-note" rows={2} value={note} onChange={(event) => { setNote(event.target.value); setNoteError(false); }} invalid={noteError} placeholder="مثلاً «عکس از نمونه‌گیری بتن اضافه شود»" />
          {noteError && <span className="hint err">برای برگشت یا رد، یادداشت بنویسید تا سرپرست بداند چه کند.</span>}
        </div>
      ) : item.heldBy ? (
        <Alert tone="inf" icon="user-check">{`نویسندهٔ این گزارش شما هستید؛ تصمیم با ${item.heldBy.fullName} است.`}</Alert>
      ) : null}

      <div className="row between wrap g8" style={{ borderTop: '1px solid #F4F4F5', paddingTop: 12 }}>
        <Link className="link t-12" to={`${ROUTES.projectReports(report.projectId)}?report=${encodeURIComponent(report.id)}`} onClick={onClose}>
          جزئیات کامل در صندوق گزارش‌ها
        </Link>
        {item.can.decide && (
          <span className="row g8">
            <Menu
              entries={[{ key: 'reject', label: 'رد آیتم', icon: 'x', tone: 'danger', onSelect: () => void decideWithNote('reject') }]}
              trigger={(props) => <IconButton {...props} icon="more-vertical" label="بیشتر" bordered />}
            />
            <AppButton variant="dangerOutline" icon="rotate-ccw" loading={decideState.isLoading} onClick={() => void decideWithNote('request_revision')}>
              برگشت برای اصلاح
            </AppButton>
            <AppButton variant="success" icon="check" loading={decisions.busyId === item.id} onClick={() => void approve()}>
              {item.status === 'stage2' ? 'تأیید نهایی' : 'تأیید'}
              <Kbd onDark>A</Kbd>
            </AppButton>
          </span>
        )}
      </div>
      <Lightbox photos={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onNavigate={setPhotoIndex} />
      {decisions.element}
    </div>
  );
}
