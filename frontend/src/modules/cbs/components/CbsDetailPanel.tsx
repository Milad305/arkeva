import { Link } from 'react-router-dom';

import { CBS_DEEP_LINKS, ROUTES } from '@/config/routes';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Skeleton, SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { Icon } from '@/shared/components/ui/Icon';
import { KeyValue, KeyValueGrid } from '@/shared/components/ui/KeyValue';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, formatQuantity, formatRatio, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useGetCbsItemQuery } from '../api/cbsApi';
import type { CbsPermissions } from '../hooks/useCbsPermissions';
import { CONSUMPTION_COLOR, consumptionTone, PRICING_LABEL } from '../services/cbsView';
import type { CbsItemDetailDto } from '../types';
import { Money } from './Money';

export interface CbsDetailPanelProps {
  projectId: EntityId;
  itemId: EntityId | null;
  can: CbsPermissions;
  onSelect: (itemId: EntityId) => void;
  onRequestRevision: (detail: CbsItemDetailDto) => void;
}

/** گرد کردن فقط در نمایش (C04). */
const round1 = (value: number) => Math.round(value * 10) / 10;

const SECTION = { padding: '12px 16px', borderBottom: '1px solid #F4F4F5' } as const;

/**
 * پنل جزئیات W14 (cbs.md ۱۲): نرخ، برآورد، مصرف‌شده، پیش‌بینی، تأمین‌کننده، فعالیت‌های
 * WBS متصل و تاریخچهٔ نرخ. همهٔ اعداد از `CbsItemProgress` سرور (۸).
 */
export function CbsDetailPanel({ projectId, itemId, can, onSelect, onRequestRevision }: CbsDetailPanelProps) {
  const { data, isFetching, isError, error, refetch } = useGetCbsItemQuery({ projectId, itemId: itemId ?? '' }, { skip: !itemId });

  if (!itemId) {
    return (
      <EmptyState
        icon="mouse-pointer-click"
        title="قلمی انتخاب نشده"
        description="روی یک ردیف کلیک کنید تا نرخ، مصرف، پیش‌بینی، فعالیت‌های متصل و تاریخچهٔ نرخ آن را ببینید."
        style={{ margin: 'auto 0' }}
      />
    );
  }

  if (!data || (isFetching && data.item.id !== itemId)) {
    if (isError) {
      const notFound = typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
      return (
        <EmptyState
          icon={notFound ? 'file-search' : 'server'}
          title={notFound ? 'این قلم در CBS فعلی نیست' : 'جزئیات بارگذاری نشد'}
          description={notFound ? 'ممکن است در بازنگری اخیر حذف شده باشد. از درخت دوباره انتخاب کنید.' : 'چند لحظهٔ دیگر دوباره امتحان کنید.'}
          actions={
            notFound ? undefined : (
              <AppButton size="sm" variant="outline" icon="refresh-cw" onClick={() => void refetch()}>
                تلاش دوباره
              </AppButton>
            )
          }
          style={{ margin: 'auto 0' }}
        />
      );
    }
    return (
      <div className="col g12" style={{ padding: '14px 16px' }} aria-busy="true">
        <Skeleton width={72} height={18} />
        <Skeleton width="80%" height={16} />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  return <DetailBody key={data.item.id} projectId={projectId} detail={data} can={can} onSelect={onSelect} onRequestRevision={onRequestRevision} />;
}

function DetailBody({
  projectId,
  detail,
  can,
  onSelect,
  onRequestRevision,
}: {
  projectId: EntityId;
  detail: CbsItemDetailDto;
  can: CbsPermissions;
  onSelect: (itemId: EntityId) => void;
  onRequestRevision: (detail: CbsItemDetailDto) => void;
}) {
  const { item } = detail;
  const progress = item.progress;
  const tone = consumptionTone(progress);
  const color = CONSUMPTION_COLOR[tone];

  return (
    <div className="col" style={{ minHeight: '100%' }}>
      {/* ── سرآیند ── */}
      <div className="col g8" style={SECTION}>
        <div className="row between">
          <Badge tone="neu" mono icon={item.isLeaf ? 'file-text' : 'folder'} style={{ fontSize: 11.5 }}>
            <span dir="ltr">{item.code}</span>
          </Badge>
          <CostTypeTag type={item.costType} />
        </div>
        {detail.path.length > 0 && (
          <nav className="row wrap g4 t-xs tx5" aria-label="جایگاه در درخت">
            {detail.path.map((entry, index) => (
              <span key={entry.id} className="row g4">
                {index > 0 && <Icon name="chevron-left" size={11} />}
                <button type="button" className="link t-xs" onClick={() => onSelect(entry.id)} title={entry.title}>
                  {entry.title}
                </button>
              </span>
            ))}
          </nav>
        )}
        <h2 className="h-t3">{item.title}</h2>
        <div className="row wrap g6">
          {progress?.alertCodes.map((code) => (
            <Badge key={code} tone={tone === 'over' ? 'err' : 'wrn'} icon="alert-triangle" title={code}>
              {code === 'AL-CST-01' ? 'مصرف بالای ۹۰٪' : 'پیش‌بینی فراتر از بودجه'}
            </Badge>
          ))}
          {item.isLeaf && item.linkCount === 0 && (
            <Badge tone="wrn" icon="unlink">
              بدون اتصال WBS
            </Badge>
          )}
          {detail.pendingRevisionCount > 0 && (
            <Badge tone="inf" icon="clock">
              {toFaDigits(detail.pendingRevisionCount)} درخواست بازنگری در انتظار
            </Badge>
          )}
        </div>
      </div>

      {/* ── مشخصات ── */}
      <KeyValueGrid columns={2} style={{ ...SECTION, gap: 12 }}>
        {item.isLeaf && <KeyValue label="شیوهٔ قیمت" value={item.pricingMode ? PRICING_LABEL[item.pricingMode] : '—'} />}
        {item.pricingMode === 'unit_rate' && <KeyValue label="برآورد" value={formatQuantity(item.estimatedQuantity, item.unit)} />}
        {can.viewAmounts && item.unitRate && <KeyValue label={`نرخ هر ${item.unit ?? 'واحد'}`} value={<Money value={item.unitRate} className="" />} />}
        {can.viewAmounts && <KeyValue label="بودجه" value={<Money value={item.budget} className="fw6" />} />}
        {can.viewAmounts && item.isLeaf && <KeyValue label="تخصیص‌یافته" value={<Money value={item.allocated} className="" />} />}
        {can.viewAmounts && item.isLeaf && BigInt(item.unallocated ?? '0') > 0n && (
          <KeyValue label="تخصیص‌نیافته" value={<Money value={item.unallocated} className="tx-wrn" />} />
        )}
        {item.supplierNote && <KeyValue label="تأمین‌کننده" value={item.supplierNote} />}
        {!item.isLeaf && <KeyValue label="اتصال‌های WBS زیرشاخه" value={toFaDigits(item.linkCount)} />}
      </KeyValueGrid>

      {/* ── مصرف و پیش‌بینی ── */}
      {progress ? (
        <div className="col g8" style={SECTION}>
          <div className="row between t-sm tx6">
            <span>مصرف بودجه</span>
            <strong className="num-i" style={{ color: tone === 'normal' ? 'var(--gray-900)' : color }}>
              {progress.consumedPercent === null ? '—' : formatPercentAuto(progress.consumedPercent)}
            </strong>
          </div>
          <ProgressBar value={Math.min(progress.consumedPercent ?? 0, 100)} color={color} label="مصرف بودجه" style={{ flex: '0 0 auto' }} />
          <KeyValueGrid columns={2} style={{ gap: 12, marginTop: 4 }}>
            {can.viewAmounts && <KeyValue label="هزینهٔ واقعی (AC)" value={<Money value={progress.ac} className="" />} />}
            {can.viewAmounts && <KeyValue label="ارزش کسب‌شده (EV)" value={<Money value={progress.ev} className="" />} />}
            <KeyValue label="CPI قلم" value={progress.cpi === null ? '—' : <span className={progress.cpi < 1 ? 'tx-wrn' : 'tx-ok'}>{formatRatio(progress.cpi, 4)}</span>} />
            {can.viewAmounts && (
              <KeyValue
                label="پیش‌بینی (EAC قلم)"
                value={
                  <span className="col">
                    <Money value={progress.eac} className="fw6" />
                    {progress.eacVariancePercent !== null && Math.abs(progress.eacVariancePercent) > 0.005 && (
                      <span className={`t-xs ${progress.eacVariancePercent > 0 ? 'tx-err' : 'tx-ok'}`}>
                        {progress.eacVariancePercent > 0 ? '+' : ''}
                        {formatPercentAuto(progress.eacVariancePercent)} نسبت به بودجه
                      </span>
                    )}
                    {progress.eacLowConfidence && <span className="t-xs tx5">کم‌اعتبار — ارزش کسب‌شده هنوز کمتر از ۱۰٪ بودجه است</span>}
                  </span>
                }
              />
            )}
          </KeyValueGrid>
          {progress.consumedQuantity !== null && item.unit && (
            <div className="box col g4" style={{ padding: '8px 10px', marginTop: 4 }}>
              <div className="row between t-12 tx7">
                <span>مقدار مصرف‌شده</span>
                <span className="num-i">{formatQuantity(round1(progress.consumedQuantity), item.unit)}</span>
              </div>
              {progress.earnedQuantity !== null && (
                <div className="row between t-12 tx7">
                  <span>مقدار کسب‌شده</span>
                  <span className="num-i">{formatQuantity(round1(progress.earnedQuantity), item.unit)}</span>
                </div>
              )}
              {progress.excessQuantity !== null && progress.excessQuantity > 0 && (
                <div className="row between t-12 tx-wrn">
                  <span title="مصالح پای کار، پرت یا هر دو">مازاد مصرف</span>
                  <span className="num-i fw6">{formatQuantity(round1(progress.excessQuantity), item.unit)}</span>
                </div>
              )}
            </div>
          )}
          <span className="t-xs tx5">پیش‌بینی قلم از CPI خود قلم است؛ جمع پیش‌بینی قلم‌ها با EAC پروژه برابر نیست.</span>
        </div>
      ) : (
        <div className="col g4" style={SECTION}>
          <span className="t-sm tx6">مصرف و پیش‌بینی پس از فعال‌سازی پروژه و ثبت هزینه محاسبه می‌شود.</span>
        </div>
      )}

      {item.isLeaf && <LinksSection projectId={projectId} detail={detail} can={can} />}

      {item.isLeaf && detail.rateHistory.length > 0 && can.viewAmounts && <RateHistory detail={detail} />}

      {/* ── اقدامات ── */}
      {item.isLeaf && (
        <div className="col g6" style={{ padding: '12px 16px', marginTop: 'auto' }}>
          {can.viewCharts && progress && (
            <LinkButton to={CBS_DEEP_LINKS.costTrend(projectId, item.id)} variant="outline" size="sm" block icon="line-chart">
              روند مصرف
            </LinkButton>
          )}
          {can.reviseBudget && (
            <LinkButton to={ROUTES.cbsEdit(projectId, item.id)} variant="primary" size="sm" block icon="pencil">
              بازنگری بودجه
            </LinkButton>
          )}
          {can.requestRevision && (
            <AppButton variant="primary" size="sm" block icon="file-pen-line" onClick={() => onRequestRevision(detail)}>
              درخواست بازنگری بودجه
            </AppButton>
          )}
        </div>
      )}
    </div>
  );
}

function LinksSection({ projectId, detail, can }: { projectId: EntityId; detail: CbsItemDetailDto; can: CbsPermissions }) {
  const { item, links } = detail;
  return (
    <div className="col g8" style={SECTION}>
      <div className="row between">
        <span className="sect-t">فعالیت‌های WBS متصل</span>
        <Link to={CBS_DEEP_LINKS.links(projectId, item.id)} className="link t-xs">
          مدیریت اتصال‌ها
        </Link>
      </div>
      {links.length === 0 ? (
        <span className="t-12 tx6">این قلم به هیچ فعالیتی وصل نیست؛ بودجه‌اش در BAC حساب نمی‌شود.</span>
      ) : (
        links.map((link) => (
          <div key={link.wbsItemId} className="row between g8 t-12">
            <span className="row g6" style={{ minWidth: 0 }}>
              <span className="mono t-xs tx5" dir="ltr">
                {link.code}
              </span>
              {can.viewWbs ? (
                <Link to={ROUTES.wbsItem(projectId, link.wbsItemId)} className="link trunc">
                  {link.title}
                </Link>
              ) : (
                <span className="trunc">{link.title}</span>
              )}
            </span>
            <span className="col ai-e nowrap" style={{ lineHeight: 1.3 }}>
              <span className="tx8">
                {link.quantity !== null ? formatQuantity(round1(link.quantity), item.unit) : can.viewAmounts ? <Money value={link.allocatedAmount} className="" /> : '—'}
              </span>
              {link.wbsActualPercent !== null && <span className="t-xs tx5">پیشرفت {formatPercentAuto(link.wbsActualPercent)}</span>}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function RateHistory({ detail }: { detail: CbsItemDetailDto }) {
  return (
    <div className="col g8" style={SECTION}>
      <span className="sect-t">تاریخچهٔ نرخ</span>
      {detail.rateHistory.map((entry) => (
        <div key={entry.versionId} className="col g2">
          <div className="row between t-12">
            <span className="fw5 tx8">{entry.versionLabel}</span>
            <Money value={entry.unitRate} className="t-12 tx8" />
          </div>
          <div className="row between t-xs tx5">
            <span>{formatJalaliDate(entry.appliedAt.slice(0, 10))}</span>
            {entry.changePercent !== null && <span className={entry.changePercent > 0 ? 'tx-err' : 'tx-ok'}>{entry.changePercent > 0 ? '+' : ''}{formatPercentAuto(entry.changePercent)}</span>}
          </div>
          {entry.note && <span className="t-xs tx6">{entry.note}</span>}
        </div>
      ))}
    </div>
  );
}
