import { useMemo, useState } from 'react';

import {
  LEAF_MEASUREMENT_METHODS,
  WEIGHT_GENERATORS,
  type LeafMeasurementMethod,
} from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardFooter } from '@/shared/components/ui/Card';
import { FormField } from '@/shared/components/ui/FormField';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { IconButton } from '@/shared/components/ui/IconButton';
import { KeyValue, KeyValueGrid } from '@/shared/components/ui/KeyValue';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { Stat, StatStrip } from '@/shared/components/ui/KpiCard';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { Timeline } from '@/shared/components/ui/Timeline';
import { TreeTable } from '@/shared/components/ui/TreeTable';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import { faNum, formatPercentAuto, formatRial, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useGetTemplatePreviewQuery } from '../api/templatesApi';
import type {
  TemplateCbsNodeDto,
  TemplateDetailDto,
  TemplateWbsNodeDto,
} from '../types';

export type TemplateTab = 'wbs' | 'cbs' | 'settings' | 'versions';

export interface TemplatePanelProps {
  template: TemplateDetailDto;
  canManage: boolean;
  canPublish: boolean;
  onValidate: () => void;
  onPublish: () => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
  onSetDefault: (isDefault: boolean) => void;
}

const MILLION = 1_000_000;

const METHOD_LABEL = (method: LeafMeasurementMethod | null) =>
  method ? LEAF_MEASUREMENT_METHODS[method] : '—';

const EAC_LABELS: Record<string, string> = {
  cpi: 'بر پایهٔ CPI',
  remaining: 'باقی‌ماندهٔ بودجه',
  composite: 'ترکیبی',
};

const DEADLINE_LABELS: Record<string, string> = {
  remind_only: 'فقط یادآوری',
  escalate: 'ارجاع به جایگزین',
};

/** بودجهٔ پیش‌نمایش پیش‌فرض به میلیون ریال — مثال مرجع ۱٬۰۰۰ (AC-TP-01). */
const defaultBudgetMillions = (template: TemplateDetailDto) =>
  template.id === 'tpl-reference' ? 1_000 : 500_000;

/**
 * پنل پیش‌نمایش قالب (W31) — سرِ قالب، شمارها، چهار زبانهٔ بوم و پانویس
 * «ساخت پروژه از این قالب».
 *
 * اعداد بودجه و روز کاری را **سرور** حساب می‌کند (`GET /templates/:id/preview`)؛
 * اینجا فقط ورودی بودجه و مدت گرفته و نتیجه نمایش داده می‌شود (D07).
 */
export function TemplatePanel({
  template,
  canManage,
  canPublish,
  onValidate,
  onPublish,
  onArchive,
  onDelete,
  onSetDefault,
}: TemplatePanelProps) {
  const [tab, setTab] = useState<TemplateTab>('wbs');
  const [budgetMillions, setBudgetMillions] = useState(() => defaultBudgetMillions(template));
  const [workdays, setWorkdays] = useState(template.referenceDurationWd);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<EntityId>>(new Set());

  const preview = useGetTemplatePreviewQuery({
    templateId: template.id,
    cbsBudgetRial: String(Math.max(0, Math.round(budgetMillions)) * MILLION),
    projectWorkdays: workdays,
  });

  const toggle = (id: EntityId) =>
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const wbsNodes = useMemo(() => preview.data?.wbs ?? [], [preview.data]);
  const cbsNodes = useMemo(() => preview.data?.cbs ?? [], [preview.data]);

  // سطح اول همیشه باز است تا پیش‌نمایش خالی به نظر نرسد.
  const expanded = useMemo(() => {
    if (expandedIds.size > 0) return expandedIds;
    const roots = tab === 'cbs' ? cbsNodes : wbsNodes;
    return new Set(roots.map((node) => node.id));
  }, [expandedIds, tab, cbsNodes, wbsNodes]);

  const menuEntries: MenuEntry[] = [
    {
      key: 'validate',
      label: 'بررسی وزن‌ها و اعتبار',
      icon: 'scale',
      onSelect: onValidate,
    },
    {
      key: 'publish',
      label: template.versions.length === 0 ? 'انتشار نسخهٔ ۱' : `انتشار نسخهٔ ${toFaDigits((template.version ?? 0) + 1)}`,
      icon: 'rocket',
      disabled: !canPublish || template.status === 'archived' || (!template.hasUnpublishedDraft && template.status === 'published'),
      disabledReason: !canPublish
        ? 'دسترسی انتشار قالب را ندارید.'
        : template.status === 'archived'
          ? 'قالب بایگانی‌شده منتشر نمی‌شود.'
          : 'تغییر منتشرنشده‌ای نیست.',
      onSelect: onPublish,
    },
    {
      key: 'default',
      label: template.isDefaultForType ? 'برداشتن از پیش‌فرض این نوع' : 'قالب پیش‌فرض این نوع',
      icon: 'star',
      note: `در پیشنهاد ساخت پروژهٔ «${template.projectTypeName}» اول می‌آید`,
      disabled: !canManage || template.status !== 'published',
      disabledReason: canManage ? 'فقط قالب منتشرشده پیش‌فرض می‌شود.' : 'دسترسی مدیریت قالب را ندارید.',
      onSelect: () => onSetDefault(!template.isDefaultForType),
    },
    { key: 'sep', separator: true },
    {
      key: 'archive',
      label: template.status === 'archived' ? 'بیرون آوردن از بایگانی' : 'بایگانی قالب',
      icon: template.status === 'archived' ? 'archive-restore' : 'archive',
      note: template.status === 'archived' ? undefined : 'در ساخت پروژه دیده نمی‌شود؛ پروژه‌های ساخته‌شده دست‌نخورده می‌مانند',
      disabled: !canManage,
      disabledReason: 'دسترسی مدیریت قالب را ندارید.',
      onSelect: () => onArchive(template.status !== 'archived'),
    },
    {
      key: 'delete',
      label: 'حذف قالب',
      icon: 'trash-2',
      tone: 'danger',
      disabled: !canManage || template.usedInProjects > 0,
      disabledReason:
        template.usedInProjects > 0
          ? 'از این قالب پروژه ساخته شده است؛ می‌توانید بایگانی‌اش کنید.'
          : 'دسترسی مدیریت قالب را ندارید.',
      onSelect: onDelete,
    },
  ];

  return (
    <Card className="col" style={{ gap: 0 }}>
      <div className="row ai-s g14 wrap" style={{ padding: '16px 18px', borderBottom: '1px solid var(--neutral-100, #F4F4F5)' }}>
        <IconBox icon={template.icon} size="xl" tone="pri" />
        <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
          <div className="row g8 wrap">
            <h2 className="h-t3">{template.name}</h2>
            {template.version ? (
              <Badge tone="pri" size="sm">{`نسخهٔ ${toFaDigits(template.version)}`}</Badge>
            ) : (
              <Badge size="sm">پیش‌نویس</Badge>
            )}
            {template.status === 'archived' && (
              <Badge tone="neu" size="sm" icon="archive">
                بایگانی‌شده
              </Badge>
            )}
            {template.isDefaultForType && (
              <Badge tone="ok" size="sm" icon="star">
                پیش‌فرض {template.projectTypeName}
              </Badge>
            )}
            {template.hasUnpublishedDraft && template.versions.length > 0 && (
              <Badge tone="wrn" size="sm">پیش‌نویس منتشرنشده</Badge>
            )}
          </div>
          <span className="t-12 tx5">
            {`${template.projectTypeName} · نگه‌دارنده: ${template.maintainerName} · آخرین تغییر ${formatJalaliDate(template.lastChangedAt)}`}
            {template.usedInProjects > 0
              ? ` · استفاده در ${toFaDigits(template.usedInProjects)} پروژه، از جمله ${template.usedInProjectNames[0]}`
              : ' · هنوز استفاده نشده'}
          </span>
          {template.originNote && <span className="t-xs tx6">{template.originNote}</span>}
        </div>
        <Menu
          align="start"
          entries={menuEntries}
          trigger={(props) => (
            <IconButton {...props} icon="more-vertical" size="sm" bordered label="گزینه‌های قالب" />
          )}
        />
      </div>

      <StatStrip columns={4}>
        <Stat label="سطح WBS" value={`${toFaDigits(template.levels)} سطح`} icon="layers" />
        <Stat label="آیتم‌های WBS" value={`${toFaDigits(template.wbsCount)} آیتم`} icon="git-branch" hint={`${toFaDigits(template.leafCount)} برگ`} />
        <Stat label="اقلام CBS" value={`${toFaDigits(template.cbsCount)} قلم`} icon="banknote" hint={`${toFaDigits(template.linkCount)} اتصال`} />
        <Stat
          label="بررسی وزن‌ها"
          value={
            <button type="button" className="row g4 t-13 fw6" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={onValidate}>
              <span className={template.weightsOk ? 'tx-ok' : 'tx-wrn'} style={{ display: 'inline-flex' }}>
                <Icon name={template.weightsOk ? 'check-circle-2' : 'alert-triangle'} size={15} />
              </span>
              <span className={template.weightsOk ? 'tx-ok' : 'tx-wrn'}>{template.weightsOk ? 'همه ۱۰۰٪' : 'نیاز به بررسی'}</span>
            </button>
          }
          icon="scale"
          hint="برای دیدن خطاها و هشدارها بزنید"
        />
      </StatStrip>

      <div className="row between wrap g8" style={{ padding: '10px 18px 0' }}>
        <SegmentedControl
          activeKey={tab}
          onChange={(key) => {
            setTab(key as TemplateTab);
            setExpandedIds(new Set());
          }}
          items={[
            { key: 'wbs', label: 'ساختار WBS' },
            { key: 'cbs', label: 'اقلام CBS' },
            { key: 'settings', label: 'تنظیمات همراه' },
            { key: 'versions', label: 'تاریخچهٔ نسخه‌ها' },
          ]}
        />
      </div>

      {(tab === 'wbs' || tab === 'cbs') && (
        <div className="row wrap g12" style={{ padding: '10px 18px 0', alignItems: 'flex-end' }}>
          <FormField label={<span className="t-xs tx5">بودجهٔ CBS پیش‌نمایش (میلیون ریال)</span>}>
            <TextInput
              size="sm"
              ltr
              style={{ width: 150 }}
              value={faNum(budgetMillions)}
              onChange={(event) => setBudgetMillions(Number(toEnDigits(event.target.value).replace(/[^\d]/g, '')) || 0)}
            />
          </FormField>
          <FormField label={<span className="t-xs tx5">مدت پروژه (روز کاری)</span>}>
            <TextInput
              size="sm"
              ltr
              style={{ width: 120 }}
              value={faNum(workdays)}
              onChange={(event) => setWorkdays(Math.max(1, Number(toEnDigits(event.target.value).replace(/[^\d]/g, '')) || 1))}
            />
          </FormField>
          <span className="t-xs tx6" style={{ paddingBottom: 8 }}>
            {`مدت مرجع قالب ${toFaDigits(template.referenceDurationWd)} روز کاری · ضریب مقیاس ${faNum(preview.data?.scaleFactor ?? 1, 2)}`}
          </span>
        </div>
      )}

      {tab === 'wbs' &&
        (preview.isLoading ? (
          <div style={{ padding: 16 }}>
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <div className="tbl-wrap" style={{ padding: '10px 0 0' }}>
            <TreeTable
              nodes={wbsNodes}
              minWidth={1000}
              caption="ساختار WBS قالب"
              expandedIds={expanded}
              onToggleExpand={toggle}
              stickyHeader
              keyboardNavigation
              titleColumn={{
                header: 'عنوان',
                minWidth: 300,
                title: (node) => node.title,
                badges: (node) =>
                  node.isMilestone ? (
                    <Badge tone="acc" size="sm" icon="milestone">
                      نقطهٔ عطف
                    </Badge>
                  ) : node.childWeightSum !== null && Math.abs(node.childWeightSum - 100) > 0.0001 ? (
                    <Badge tone="wrn" size="sm" title="جمع وزن فرزندان ۱۰۰ نیست">
                      {`Σ ${formatPercentAuto(node.childWeightSum)}`}
                    </Badge>
                  ) : node.areaName ? (
                    <Badge size="sm">{node.areaName}</Badge>
                  ) : null,
              }}
              columns={WBS_COLUMNS}
            />
          </div>
        ))}

      {tab === 'cbs' &&
        (preview.isLoading ? (
          <div style={{ padding: 16 }}>
            <SkeletonTable rows={6} />
          </div>
        ) : cbsNodes.length === 0 ? (
          <div style={{ padding: 16 }}>
            <Alert tone="wrn">
              این قالب قلم CBS ندارد، پس با ساخت پروژه بودجه نمی‌شکند. اقلام را بعد از ساخت در دفتر CBS پروژه وارد کنید.
            </Alert>
          </div>
        ) : (
          <>
            <div className="tbl-wrap" style={{ padding: '10px 0 0' }}>
              <TreeTable
                nodes={cbsNodes}
                minWidth={780}
                caption="اقلام CBS قالب"
                expandedIds={expanded}
                onToggleExpand={toggle}
                stickyHeader
                keyboardNavigation
                titleColumn={{
                  header: 'عنوان قلم',
                  minWidth: 260,
                  title: (node) => node.title,
                  badges: (node) => (node.linkCount === 0 ? <Badge tone="wrn" size="sm">بی‌اتصال</Badge> : null),
                }}
                columns={CBS_COLUMNS}
              />
            </div>
            <div className="row g12 wrap" style={{ padding: '10px 18px 0' }}>
              <span className="t-12 tx6 grow">
                {`جمع بودجهٔ اقلام ${formatRial(preview.data?.cbsTotal ?? '0')} · جمع BAC برگ‌های WBS ${formatRial(preview.data?.wbsTotal ?? '0')}`}
              </span>
            </div>
          </>
        ))}

      {tab === 'settings' && (
        <div className="col g12" style={{ padding: '14px 18px' }}>
          <span className="t-12 tx6">
            این تنظیمات با ساخت پروژه کپی می‌شوند. تقویم، موقعیت، تیم و اعلان‌ها کپی نمی‌شوند و در ویزارد تعیین می‌شوند.
          </span>
          <KeyValueGrid columns={2}>
            <KeyValue label="روش وزن‌دهی" value={WEIGHT_GENERATORS[template.settings.weightGenerator]} />
            <KeyValue
              label="آستانهٔ انحراف"
              value={`هشدار ${formatPercentAuto(template.settings.warningThreshold)} · بحرانی ${formatPercentAuto(template.settings.criticalThreshold)}`}
            />
            <KeyValue label="روش پیش‌بینی (EAC)" value={EAC_LABELS[template.settings.eacMethod] ?? template.settings.eacMethod} />
            <KeyValue
              label="گردش تأیید"
              value={template.settings.approvalMode === 'two_stage' ? 'دومرحله‌ای (با شرط)' : 'یک‌مرحله‌ای'}
            />
            <KeyValue
              label="شرط‌های مرحلهٔ دوم"
              value={
                [
                  template.settings.stage2OnCritical && 'انحراف بحرانی',
                  template.settings.stage2OnJump && 'جهش غیرعادی',
                  template.settings.stage2OnGpsOut && 'خارج از محدودهٔ کارگاه',
                  template.settings.stage2OnCriticalPath && 'روی مسیر بحرانی',
                ]
                  .filter(Boolean)
                  .join(' · ') || 'بدون شرط'
              }
            />
            <KeyValue
              label="مهلت بررسی"
              value={`${toFaDigits(template.settings.reviewDeadlineHours)} ساعت · ${DEADLINE_LABELS[template.settings.onDeadline] ?? template.settings.onDeadline}`}
            />
            <KeyValue
              label="تأیید خودکار"
              value={
                template.settings.autoApproveEnabled
                  ? `تغییر کمتر از ${formatPercentAuto(template.settings.autoApproveMaxDelta)}`
                  : 'خاموش'
              }
            />
            <KeyValue
              label="قواعد گزارش کارگاه"
              value={`حداقل ${toFaDigits(template.settings.minPhotos)} عکس · جهش بیش از ${formatPercentAuto(template.settings.maxJumpPct)} پرچم می‌گیرد · ${template.settings.allowDecrease ? 'کاهش مجاز' : 'کاهش غیرمجاز'}`}
            />
          </KeyValueGrid>
          {template.areas.length > 0 && (
            <>
              <h4 className="t-13 fw6 tx8">حوزه‌های تأیید</h4>
              <span className="t-xs tx6">
                حوزه‌ها بدون ناظر ساخته می‌شوند؛ تا تعیین ناظر در ویزارد، گزارش‌ها به مدیر پروژه می‌رسند.
              </span>
              <div className="row g8 wrap">
                {template.areas.map((area) => (
                  <Badge key={area.key} size="md" icon="folder-tree">
                    {`${area.name}${area.rootTitles.length > 0 ? ` — ${area.rootTitles.join('، ')}` : ''}`}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'versions' && (
        <div className="col g10" style={{ padding: '14px 18px' }}>
          {template.versions.length === 0 ? (
            <Alert tone="inf">
              این قالب هنوز نسخه‌ای منتشر نکرده است. با «انتشار» نسخهٔ ۱ ساخته می‌شود و از آن پس در ساخت پروژه دیده
              می‌شود.
            </Alert>
          ) : (
            <Timeline
              entries={template.versions.map((entry) => ({
                id: String(entry.version),
                icon: 'rocket',
                tone: entry.version === template.version ? 'ok' : 'neu',
                text: (
                  <>
                    <strong>{`نسخهٔ ${toFaDigits(entry.version)}`}</strong>
                    {` — ${entry.note} · ${entry.authorName} · ${toFaDigits(entry.wbsCount)} آیتم و ${toFaDigits(entry.cbsCount)} قلم`}
                  </>
                ),
                time: formatJalaliDateTime(entry.publishedAt),
              }))}
            />
          )}
        </div>
      )}

      <CardFooter className="row g12 wrap">
        <span className="t-12 tx6 grow" style={{ minWidth: 200 }}>
          با ساخت پروژه از این قالب، WBS، اقلام CBS، اتصال‌ها، روش محاسبهٔ پیشرفت و گردش‌کار کپی می‌شود؛ تاریخ‌ها از
          تاریخ شروع پروژه محاسبه می‌شوند.
        </span>
        <AppButton
          size="sm"
          icon="pencil"
          disabled
          title="ویرایشگر قالب با طراحی حالت قالب ویرایشگر WBS می‌آید (شکاف G20)."
        >
          ویرایش قالب
        </AppButton>
        <LinkButton
          variant="primary"
          size="sm"
          icon="folder-plus"
          to={`${ROUTES.newProject}?template=${template.id}`}
          aria-disabled={template.status !== 'published'}
        >
          ساخت پروژه از این قالب
        </LinkButton>
      </CardFooter>
    </Card>
  );
}

const WBS_COLUMNS: Array<Column<TemplateWbsNodeDto>> = [
  {
    key: 'code',
    header: 'کد',
    width: 92,
    render: (node) => (
      <span className="mono t-sm tx6" dir="ltr">
        {node.code}
      </span>
    ),
  },
  {
    key: 'weight',
    header: 'وزن',
    minWidth: 104,
    render: (node) => (
      <span className="row g6" style={{ minWidth: 90 }}>
        <span className="t-12 fw5 tx8" style={{ width: 34 }}>
          {formatPercentAuto(node.weightInParent)}
        </span>
        <ProgressBar value={node.weightInParent} size="thin" color="#8AA2C2" style={{ minWidth: 44, flex: '0 0 auto', width: 48 }} />
      </span>
    ),
  },
  {
    key: 'method',
    header: 'روش',
    minWidth: 92,
    render: (node) => <span className="t-12 tx7">{node.isMilestone ? 'نقطهٔ عطف' : METHOD_LABEL(node.measurementMethod)}</span>,
  },
  {
    key: 'unit',
    header: 'واحد مقدار',
    minWidth: 82,
    render: (node) => <span className="t-12 tx7">{node.unit ?? '—'}</span>,
  },
  {
    key: 'time',
    header: 'روز کاری در پروژه',
    minWidth: 118,
    render: (node) => (
      <span className="t-12 tx7" dir="ltr" style={{ display: 'inline-block' }}>
        {`${toFaDigits(node.previewStartWd)} – ${toFaDigits(node.previewFinishWd)}`}
      </span>
    ),
  },
  {
    key: 'bac',
    header: 'BAC با پیش‌نمایش',
    minWidth: 124,
    render: (node) => <span className="t-12 fw5 tx9">{formatRial(node.previewBac)}</span>,
  },
  {
    key: 'links',
    header: 'اقلام CBS متصل',
    minWidth: 180,
    render: (node) => (
      <div className="row g4 wrap">
        {node.linkedCbs.length === 0 ? (
          <span className="t-xs tx5">—</span>
        ) : (
          node.linkedCbs.map((link) => (
            <span key={link.code} className="row g4" title={`${link.title} · ضریب ${link.parts}`}>
              <CostTypeTag type={link.costType} />
              <span className="t-xs tx6">{toFaDigits(link.parts)}</span>
            </span>
          ))
        )}
      </div>
    ),
  },
];

const CBS_COLUMNS: Array<Column<TemplateCbsNodeDto>> = [
  {
    key: 'code',
    header: 'کد',
    width: 96,
    render: (node) => (
      <span className="mono t-sm tx6" dir="ltr">
        {node.code}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'نوع هزینه',
    minWidth: 118,
    render: (node) => <CostTypeTag type={node.costType} />,
  },
  {
    key: 'share',
    header: 'سهم بودجه',
    minWidth: 92,
    render: (node) => (
      <span className="t-12 tx8">{node.sharePct === null ? '—' : formatPercentAuto(node.sharePct)}</span>
    ),
  },
  {
    key: 'budget',
    header: 'بودجه با پیش‌نمایش',
    minWidth: 132,
    render: (node) => <span className="t-12 fw5 tx9">{formatRial(node.previewBudget)}</span>,
  },
  {
    key: 'links',
    header: 'اتصال‌ها',
    minWidth: 82,
    render: (node) => <span className="t-12 tx7">{toFaDigits(node.linkCount)}</span>,
  },
];
