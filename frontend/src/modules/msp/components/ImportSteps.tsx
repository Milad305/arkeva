import { WEIGHT_GENERATORS } from '@/config/constants';
import { useState } from 'react';

import { WEIGHT_GENERATOR_HINTS, type WeightGenerator } from '@/config/constants';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Checkbox, Radio } from '@/shared/components/ui/SelectionControls';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { Stat, StatStrip } from '@/shared/components/ui/KpiCard';
import { TextInput } from '@/shared/components/ui/TextInput';
import { TreeTable } from '@/shared/components/ui/TreeTable';
import { formatJalaliDate } from '@/shared/utils/date';
import { faNum, formatPercentAuto, formatRial, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type {
  CheckSeverity,
  ImportCheckDto,
  ImportPreviewDto,
  ImportSessionDto,
  MappingOptionsDto,
  MappingRowDto,
  OpeningProgressRowDto,
  PreviewNodeDto,
  ResourceRowDto,
} from '../types';

/** روش‌های تولید وزن برای گروه‌های بی وزن فایل (msp-integration.md ۷.۱؛ «دستی» معنا ندارد). */
const GENERATOR_ITEMS = Object.entries(WEIGHT_GENERATORS)
  .filter(([key]) => key !== 'manual')
  .map(([key, label]) => ({ key, label }));

const SEVERITY: Record<CheckSeverity, { icon: IconName; className: string; background: string }> = {
  ok: { icon: 'check-circle-2', className: 'tx-ok', background: '#FFFFFF' },
  warning: { icon: 'alert-triangle', className: 'tx-wrn', background: '#FFFCF5' },
  error: { icon: 'x-circle', className: 'tx-err', background: '#FEF8F8' },
};

const STATUS_META: Record<
  MappingRowDto['status'],
  { icon: IconName; className: string; title: string }
> = {
  auto: { icon: 'check-circle-2', className: 'tx-ok', title: 'تطبیق خودکار' },
  manual: { icon: 'pencil', className: 'tx-acc', title: 'تطبیق دستی شما' },
  warning: { icon: 'alert-triangle', className: 'tx-wrn', title: 'نیاز به بررسی' },
  skipped: { icon: 'minus', className: 'tx5', title: 'وارد نمی‌شود' },
};

// ── مرحلهٔ ۱ (W34) ──

export interface UploadStepProps {
  session: ImportSessionDto | null;
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onResolve: (checkId: string, resolution: string) => void;
  onOption: (option: 'buildCbs' | 'importBaseline' | 'importProgress', value: boolean) => void;
}

/** W34 — بارگذاری و اعتبارسنجی (۷.۱ گام ۱). خطا ادامه را می‌بندد، هشدار نه (AC-MS-03). */
export function ImportUploadStep({
  session,
  busy,
  error,
  onFile,
  onResolve,
  onOption,
}: UploadStepProps) {
  if (!session) {
    return (
      <Card>
        <CardBody>
          <Dropzone
            accept=".xml,.mpp"
            icon="file-up"
            title="فایل برنامه را بارگذاری کنید"
            description="XML ذخیره‌شده از Microsoft Project (MSPDI) یا فایل MPP نسخهٔ ۲۰۱۰ به بعد"
            hint="حداکثر ۲۰ مگابایت · فایل اصلی شما تغییر نمی‌کند"
            disabled={busy}
            onFiles={(files) => files[0] && onFile(files[0])}
          />
          {busy && (
            <div style={{ paddingTop: 14 }}>
              <SkeletonTable rows={4} />
            </div>
          )}
          {error && (
            <div style={{ paddingTop: 14 }}>
              <Alert tone="err">{error}</Alert>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  const stats = session.stats;
  return (
    <div className="col g16" style={{ minWidth: 0 }}>
      <Card>
        <CardHeader
          title="فایل برنامه"
          subtitle="MPP نسخهٔ ۲۰۱۰ به بعد یا XML ذخیره‌شده از Microsoft Project"
          action={
            <label className="btn btn-g btn-sm" style={{ cursor: 'pointer' }}>
              <Icon name="replace" size={14} />
              انتخاب فایل دیگر
              <input
                type="file"
                accept=".xml,.mpp"
                className="sr-input"
                onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
              />
            </label>
          }
        />
        <CardBody className="col g12">
          <div
            className="row g12 ai-s"
            style={{
              padding: '12px 14px',
              border: '1px solid #A7D7B8',
              background: '#ECFDF3',
              borderRadius: 10,
            }}
          >
            <IconBox icon="file-check" tone="ok" />
            <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
              <span className="mono t-13 fw6 tx9 trunc" dir="ltr" style={{ textAlign: 'start' }}>
                {session.fileName}
              </span>
              <span className="t-xs tx6">
                {`${session.fileSizeLabel} · ${toFaDigits(stats.tasks)} فعالیت · ${toFaDigits(stats.resources)} منبع`}
                {stats.statusDate ? ` · Status Date ${formatJalaliDate(stats.statusDate)}` : ''}
              </span>
            </div>
            <span className="row g4 t-12 fw6 tx-ok">
              <Icon name="check-circle-2" size={15} />
              خوانده شد
            </span>
          </div>

          {session.sourceNote && <Alert tone="inf">{session.sourceNote}</Alert>}

          <StatStrip columns={4}>
            <Stat label="فاز (سطح ۱)" value={toFaDigits(stats.phases)} />
            <Stat
              label="فعالیت"
              value={toFaDigits(stats.tasks)}
              hint={`${toFaDigits(stats.leaves)} برگ`}
            />
            <Stat label="منبع" value={toFaDigits(stats.resources)} />
            <Stat label="بازهٔ برنامه" value={stats.spanLabel} />
          </StatStrip>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="نتیجهٔ اعتبارسنجی"
          subtitle={`${toFaDigits(session.checks.filter((check) => check.severity === 'ok').length)} مورد سالم · ${toFaDigits(session.checks.filter((check) => check.severity === 'warning').length)} هشدار · ${toFaDigits(session.checks.filter((check) => check.severity === 'error').length)} خطا`}
        />
        <div className="col">
          {session.checks.map((check) => (
            <CheckRow key={check.id} check={check} onResolve={onResolve} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="گزینه‌های ورود" />
        <CardBody className="col g12">
          <Checkbox
            checked={session.options.buildCbs}
            onChange={(event) => onOption('buildCbs', event.target.checked)}
            className="ai-s"
            label={
              <span className="col" style={{ gap: 2 }}>
                <span className="t-13 fw5 tx9">ساخت CBS از هزینه‌های فایل</span>
                <span className="t-xs tx5">
                  برای هر فاز یک گروه و برای هر فعالیت دارای هزینه یک قلم مقطوع با اتصال ساخته
                  می‌شود
                </span>
              </span>
            }
          />
          <Checkbox
            checked={session.options.importBaseline}
            onChange={(event) => onOption('importBaseline', event.target.checked)}
            className="ai-s"
            label={
              <span className="col" style={{ gap: 2 }}>
                <span className="t-13 fw5 tx9">ورود برنامهٔ مبنا</span>
                <span className="t-xs tx5">برای محاسبهٔ انحراف و PV در نمودارها</span>
              </span>
            }
          />
          <Checkbox
            checked={session.options.importProgress}
            onChange={(event) => onOption('importProgress', event.target.checked)}
            className="ai-s"
            label={
              <span className="col" style={{ gap: 2 }}>
                <span className="t-13 fw5 tx9">ورود درصد پیشرفت فعلی فایل</span>
                <span className="t-xs tx5">
                  {stats.tasksWithProgress > 0
                    ? `${toFaDigits(stats.tasksWithProgress)} فعالیت در فایل درصد دارد؛ در مرحلهٔ ۳ انتخاب می‌کنید چه چیزی وارد شود`
                    : 'در این فایل فعالیتی با درصد پیشرفت نیست'}
                </span>
              </span>
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

function CheckRow({
  check,
  onResolve,
}: {
  check: ImportCheckDto;
  onResolve: (checkId: string, resolution: string) => void;
}) {
  const meta = SEVERITY[check.severity];
  return (
    <div
      className="row ai-s g12"
      style={{
        padding: '12px 18px',
        borderBottom: '1px solid #F4F4F5',
        background: meta.background,
      }}
    >
      <span className={meta.className} style={{ display: 'inline-flex', marginTop: 1 }}>
        <Icon name={meta.icon} size={17} />
      </span>
      <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
        <span className="t-13 fw5 tx9">{check.title}</span>
        {check.detail && <span className="t-12 tx6">{check.detail}</span>}
        {check.items.length > 0 && (
          <span className="row g4 wrap">
            {check.items.slice(0, 6).map((item) => (
              <Badge key={item} size="sm" mono>
                {item}
              </Badge>
            ))}
          </span>
        )}
        {check.resolutions.length > 0 && (
          <div className="row g8 wrap" style={{ marginTop: 4 }}>
            {check.resolutions.map((resolution) => (
              <Radio
                key={resolution.id}
                name={`resolve-${check.id}`}
                checked={check.resolution === resolution.id}
                onChange={() => onResolve(check.id, resolution.id)}
                label={resolution.label}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── مرحلهٔ ۲ (W35) ──

export interface MappingStepProps {
  session: ImportSessionDto;
  options: MappingOptionsDto;
  onMapping: (rowId: string, target: string) => void;
  onResource: (rowId: string, userId: EntityId | null, action: ResourceRowDto['action']) => void;
  onWeightGenerator: (value: WeightGenerator) => void;
  onSaveTemplate: (value: boolean) => void;
}

/** W35 — تطبیق ستون‌ها، منابع ← سرپرست و مولد وزن (۷.۱ گام ۲). */
export function ImportMappingStep({
  session,
  options,
  onMapping,
  onResource,
  onWeightGenerator,
  onSaveTemplate,
}: MappingStepProps) {
  const targetOptions: Array<SelectOption<string>> = options.targets.map((target) => ({
    value: target.value,
    label: target.label,
  }));
  const userOptions: Array<SelectOption<string>> = [
    { value: '', label: 'بدون سرپرست' },
    ...options.users.map((user) => ({ value: user.id, label: user.fullName })),
  ];

  const columns: Array<Column<MappingRowDto>> = [
    {
      key: 'field',
      header: 'فیلد Microsoft Project',
      minWidth: 170,
      render: (row) => (
        <div className="col" style={{ gap: 1 }}>
          <span className="mono t-12 fw6 tx9" dir="ltr" style={{ textAlign: 'start' }}>
            {row.mspField}
          </span>
          <span className="t-xs tx5">{row.mspHint}</span>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'فیلد پروژه‌یار',
      minWidth: 210,
      render: (row) => (
        <Select
          size="sm"
          width={200}
          options={targetOptions}
          value={row.target}
          onChange={(value) => onMapping(row.id, value)}
          label={`فیلد پروژه‌یار برای ${row.mspField}`}
        />
      ),
    },
    {
      key: 'sample',
      header: 'نمونهٔ مقدار',
      minWidth: 170,
      render: (row) => <span className="t-12 tx7">{row.sample}</span>,
    },
    {
      key: 'status',
      header: 'وضعیت',
      width: 90,
      align: 'center',
      render: (row) => (
        <span
          className={STATUS_META[row.status].className}
          style={{ display: 'inline-flex' }}
          title={STATUS_META[row.status].title}
        >
          <Icon name={STATUS_META[row.status].icon} size={16} />
        </span>
      ),
    },
  ];

  return (
    <div className="col g16" style={{ minWidth: 0 }}>
      <Card>
        <CardHeader
          title="تطبیق فیلدهای فایل با پروژه‌یار"
          subtitle={`${toFaDigits(session.mapping.filter((row) => row.status === 'auto').length)} فیلد خودکار تطبیق داده شد · ${toFaDigits(session.mapping.filter((row) => row.status === 'warning' || row.status === 'manual').length)} فیلد نیاز به بررسی دارد`}
          action={
            <Badge icon="layout-template" size="md">
              {`الگوی ذخیره‌شده: ${session.templateName}`}
            </Badge>
          }
        />
        <DataTable
          rows={session.mapping}
          columns={columns}
          getRowId={(row) => row.id}
          minWidth={720}
          caption="تطبیق فیلدها"
        />
      </Card>

      {session.resources.length > 0 && (
        <Card>
          <CardHeader
            title="تطبیق منابع با سرپرستان کارگاه"
            subtitle={`ستون Resource Names به سرپرست هر آیتم تبدیل می‌شود · ${toFaDigits(session.resources.filter((row) => !row.userId).length)} نام بدون تطبیق`}
          />
          <div className="col">
            {session.resources.map((row) => (
              <div
                key={row.id}
                className="row g12 wrap"
                style={{
                  padding: '10px 18px',
                  borderBottom: '1px solid #F4F4F5',
                  alignItems: 'center',
                }}
              >
                <span
                  className="mono t-12 tx8"
                  dir="ltr"
                  style={{ width: 150, textAlign: 'start' }}
                >
                  {row.name}
                </span>
                <span
                  className="t-xs tx5"
                  style={{ width: 80 }}
                >{`${toFaDigits(row.taskCount)} فعالیت`}</span>
                <span className="tx5" style={{ display: 'inline-flex' }}>
                  <Icon name="arrow-left" size={14} />
                </span>
                <Select
                  size="sm"
                  width={230}
                  options={userOptions}
                  value={row.userId ?? ''}
                  onChange={(value) => onResource(row.id, value || null, value ? 'match' : 'skip')}
                  label={`سرپرست برای ${row.name}`}
                />
                {row.userId ? (
                  <span className="row g6 t-xs tx-ok">
                    <Avatar
                      name={row.userName ?? ''}
                      initials={row.initials ?? undefined}
                      tone={row.avatarTone ?? undefined}
                      size="s"
                    />
                    تطبیق شد
                  </span>
                ) : (
                  <span className="t-xs tx-wrn">بدون تطبیق — فعالیت‌هایش بدون سرپرست می‌مانند</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="وزن آیتم‌ها"
          subtitle="فایل MSP وزن ندارد؛ وزن هر آیتم در والدش از یکی از این روش‌ها ساخته می‌شود"
        />
        <CardBody className="col g10">
          <SegmentedControl
            activeKey={session.weightGenerator}
            onChange={(key) => onWeightGenerator(key as WeightGenerator)}
            items={GENERATOR_ITEMS}
          />
          <span className="t-12 tx6">{WEIGHT_GENERATOR_HINTS[session.weightGenerator]}</span>
          <span className="row g4 t-12 tx-ok">
            <Icon name="check-circle-2" size={13} />
            جمع وزن فرزندان هر گروه دقیقاً ۱۰۰٪ می‌شود و بعداً در WBS قابل ویرایش است
          </span>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Checkbox
            checked={session.saveTemplate}
            onChange={(event) => onSaveTemplate(event.target.checked)}
            className="ai-s"
            label={
              <span className="col" style={{ gap: 2 }}>
                <span className="t-13 fw5 tx9">{`به‌روزرسانی الگوی «${session.templateName}»`}</span>
                <span className="t-xs tx5">
                  تطبیق‌های دستی به الگوی سازمان اضافه می‌شود تا در ورودهای بعدی خودکار انجام شود
                </span>
              </span>
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

// ── مرحلهٔ ۳ (W49) ──

export interface ReviewStepProps {
  preview: ImportPreviewDto;
  opening: OpeningProgressRowDto[];
  onOpeningChange: (id: string, patch: { percent?: number; selected?: boolean }) => void;
}

/** W49 — پیش‌نمایش درخت نهایی، بررسی‌ها و پیشرفت اولیه (۷.۱ گام ۳ · OD-16). */
export function ImportReviewStep({ preview, opening, onOpeningChange }: ReviewStepProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    new Set(preview.tree.map((node) => node.id)),
  );
  const [onlyWithout, setOnlyWithout] = useState(false);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filter = (nodes: PreviewNodeDto[]): PreviewNodeDto[] =>
    nodes
      .map((node) => {
        const children = node.children ? filter(node.children) : undefined;
        if (node.isLeaf) return !onlyWithout || node.supervisorName === null ? node : null;
        return children && children.length > 0 ? { ...node, children } : null;
      })
      .filter((node): node is PreviewNodeDto => node !== null);

  const nodes = onlyWithout ? filter(preview.tree) : preview.tree;

  const columns: Array<Column<PreviewNodeDto>> = [
    {
      key: 'code',
      header: 'کد',
      width: 90,
      render: (node) => (
        <span className="mono t-sm tx6" dir="ltr">
          {node.code}
        </span>
      ),
    },
    {
      key: 'weight',
      header: 'وزن در والد',
      minWidth: 110,
      render: (node) => (
        <span className="row g6" style={{ minWidth: 96 }}>
          <span className="t-12 fw5 tx8" style={{ width: 34 }}>
            {formatPercentAuto(node.weightInParent)}
          </span>
          <span className="pbar thin" style={{ minWidth: 44, flex: '0 0 auto', width: 48 }}>
            <i style={{ width: `${node.weightInParent}%`, background: '#8AA2C2' }} />
          </span>
        </span>
      ),
    },
    {
      key: 'budget',
      header: 'بودجه',
      minWidth: 120,
      render: (node) => <span className="t-12 tx8">{formatRial(node.budget)}</span>,
    },
    {
      key: 'start',
      header: 'شروع',
      minWidth: 96,
      render: (node) => <span className="t-sm tx7">{formatJalaliDate(node.start)}</span>,
    },
    {
      key: 'finish',
      header: 'پایان',
      minWidth: 96,
      render: (node) => <span className="t-sm tx7">{formatJalaliDate(node.finish)}</span>,
    },
    {
      key: 'supervisor',
      header: 'سرپرست',
      minWidth: 130,
      render: (node) =>
        node.supervisorName ? (
          <span className="t-12 tx7">{node.supervisorName}</span>
        ) : node.isLeaf ? (
          <span className="row g4 t-12 tx-wrn">
            <Icon name="alert-triangle" size={13} />
            بدون سرپرست
          </span>
        ) : (
          <span className="t-12 tx5">—</span>
        ),
    },
  ];

  return (
    <div className="col g16" style={{ minWidth: 0 }}>
      <StatStrip columns={5}>
        {preview.summary.map((entry) => (
          <Stat key={entry.label} label={entry.label} value={entry.value} hint={entry.hint} />
        ))}
      </StatStrip>

      <Card>
        <CardHeader
          title="پیش‌نمایش WBS نهایی"
          icon="list-tree"
          iconClassName="tx-pri"
          subtitle="همان چیزی که پس از ساخت در صفحهٔ WBS می‌بینید"
          action={
            <AppButton
              size="sm"
              icon="alert-triangle"
              variant={onlyWithout ? 'primary' : 'outline'}
              onClick={() => setOnlyWithout((value) => !value)}
            >
              {`فقط بدون سرپرست ${toFaDigits(preview.withoutSupervisor)}`}
            </AppButton>
          }
        />
        <div className="tbl-wrap">
          <TreeTable
            nodes={nodes}
            minWidth={900}
            caption="پیش‌نمایش ساختار ورودی"
            expandedIds={expanded}
            onToggleExpand={toggle}
            stickyHeader
            keyboardNavigation
            isLeaf={(node) => node.isLeaf}
            titleColumn={{
              header: 'عنوان',
              minWidth: 280,
              title: (node) => node.title,
              badges: (node) =>
                node.isMilestone ? (
                  <Badge size="sm" tone="acc" icon="milestone">
                    نقطهٔ عطف
                  </Badge>
                ) : node.isLeaf && node.unit ? (
                  <span className="t-xs tx5">{`${faNum(node.quantity ?? 0)} ${node.unit}`}</span>
                ) : !node.isLeaf ? (
                  <span className="t-xs tx5">{`${toFaDigits(node.childCount)} آیتم`}</span>
                ) : null,
            }}
            columns={columns}
          />
        </div>
      </Card>

      {opening.length > 0 && (
        <Card>
          <CardHeader
            title="پیشرفت اولیه از فایل"
            subtitle={`${toFaDigits(opening.length)} فعالیت در فایل درصد دارد · تاریخ کار ${preview.statusDate ? formatJalaliDate(preview.statusDate) : 'روز ورود'}`}
          />
          <DataTable
            rows={opening}
            getRowId={(row) => row.id}
            minWidth={620}
            caption="پیشرفت اولیه"
            columns={[
              {
                key: 'select',
                header: '',
                width: 44,
                render: (row) => (
                  <Checkbox
                    checked={row.selected}
                    onChange={(event) =>
                      onOpeningChange(row.id, { selected: event.target.checked })
                    }
                    aria-label={`ورود پیشرفت ${row.title}`}
                  />
                ),
              },
              {
                key: 'item',
                header: 'فعالیت',
                minWidth: 240,
                render: (row) => (
                  <div className="col" style={{ gap: 1 }}>
                    <span className="t-12 fw5 tx9">{row.title}</span>
                    <span className="mono t-xs tx5">{row.code}</span>
                  </div>
                ),
              },
              {
                key: 'method',
                header: 'روش',
                minWidth: 90,
                render: (row) => <span className="t-12 tx7">{row.method}</span>,
              },
              {
                key: 'file',
                header: 'درصد فایل',
                minWidth: 90,
                render: (row) => (
                  <span className="t-12 tx6">{formatPercentAuto(row.filePercent)}</span>
                ),
              },
              {
                key: 'percent',
                header: 'درصدی که وارد می‌شود',
                minWidth: 140,
                render: (row) => (
                  <TextInput
                    size="sm"
                    ltr
                    style={{ width: 90 }}
                    value={faNum(row.percent)}
                    onChange={(event) =>
                      onOpeningChange(row.id, {
                        percent: Math.min(
                          100,
                          Math.max(
                            0,
                            Number(toEnDigits(event.target.value).replace(/[^\d]/g, '')) || 0,
                          ),
                        ),
                      })
                    }
                    aria-label={`درصد ورودی ${row.title}`}
                  />
                ),
              },
            ]}
          />
          <CardBody>
            <Alert tone="inf">
              این درصدها به‌صورت گزارش «ورود اولیه» ثبت و همان لحظه تأیید می‌شوند؛ در تاریخچهٔ آیتم
              با منبع «ورود اولیه» دیده می‌شوند و عکس لازم ندارند.
            </Alert>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="بررسی نهایی" />
        <div className="col">
          {preview.checks.map((check, index) => (
            <div
              key={`${check.text}-${index}`}
              className="row ai-s g10"
              style={{ padding: '10px 16px', borderBottom: '1px solid #F4F4F5' }}
            >
              <span
                className={SEVERITY[check.severity].className}
                style={{ display: 'inline-flex', marginTop: 1 }}
              >
                <Icon name={SEVERITY[check.severity].icon} size={16} />
              </span>
              <div className="col grow" style={{ gap: 2 }}>
                <span className="t-13 tx9">{check.text}</span>
                {check.link && (
                  <a className="link t-12" href={check.link.to}>
                    {check.link.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
