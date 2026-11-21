import { useState } from 'react';

import { Content } from '@/shared/components/layout/AppShell';
import { Workspace, WorkspaceToolbar, WorkspaceScroll } from '@/shared/components/layout/Workspace';
import {
  Alert,
  AppButton,
  Avatar,
  AvatarGroup,
  Badge,
  Box,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Chip,
  CostTypeTag,
  DataTable,
  Delta,
  DualProgress,
  FormField,
  Icon,
  IconBox,
  IconButton,
  Kbd,
  KeyValue,
  KeyValueGrid,
  KpiCard,
  Legend,
  LinkButton,
  Menu,
  MenuList,
  Modal,
  OptionCard,
  PageHead,
  Pagination,
  PhotoThumb,
  ProgressBar,
  Radio,
  SegmentedControl,
  Select,
  Stat,
  StatStrip,
  Stepper,
  Switch,
  Tabs,
  TextArea,
  TextInput,
  Timeline,
  Tooltip,
  TreeTable,
  type Column,
} from '@/shared/components/ui';
import {
  EmptyState,
  InlineLoading,
  Skeleton,
  SkeletonKpiRow,
  SkeletonTable,
  toast,
} from '@/shared/components/feedback';
import { formatPercent, formatRial, toFaDigits } from '@/shared/utils/num';
import { PROGRESS_STATUS_ROW_CLASS, progressColor, progressStatus } from '@/shared/utils/deviation';
import type { Tone } from '@/shared/types/tone';

/** گالری کامپوننت‌ها — ابزار تست چشمی. معادل Design System و W45 و W46 بوم. */

const TONES: Tone[] = ['ok', 'inf', 'wrn', 'err', 'neu', 'pri', 'acc', 'vio', 'cya'];

interface DemoRow {
  id: string;
  name: string;
  code: string;
  planned: number;
  actual: number;
  budget: number;
}

const DEMO_ROWS: DemoRow[] = [
  { id: '1', name: 'مجتمع مسکونی نگین شهر', code: 'PRJ-1404-021', planned: 70, actual: 65, budget: 850e9 },
  { id: '2', name: 'پل شهید سلیمانی', code: 'PRJ-1402-008', planned: 50, actual: 42, budget: 2400e9 },
  { id: '3', name: 'نیروگاه خورشیدی یزد', code: 'PRJ-1404-017', planned: 35, actual: 15, budget: 1500e9 },
  { id: '4', name: 'تونل البرز', code: 'PRJ-1401-012', planned: 25, actual: 30, budget: 8600e9 },
];

interface DemoNode {
  id: string;
  code: string;
  title: string;
  weight: number;
  planned: number;
  actual: number;
  children?: DemoNode[];
}

const DEMO_TREE: DemoNode[] = [
  {
    id: '1',
    code: '1.1',
    title: 'عملیات خاکی',
    weight: 15,
    planned: 100,
    actual: 100,
    children: [
      { id: '11', code: '1.1.1', title: 'خاکبرداری', weight: 40, planned: 100, actual: 100 },
      { id: '12', code: '1.1.2', title: 'خاکریزی', weight: 30, planned: 100, actual: 100 },
    ],
  },
  {
    id: '2',
    code: '1.2',
    title: 'سازه',
    weight: 45,
    planned: 80,
    actual: 72,
    children: [
      { id: '21', code: '1.2.1', title: 'فونداسیون', weight: 30, planned: 100, actual: 100 },
      { id: '22', code: '1.2.3', title: 'قالب‌بندی سقف طبقهٔ دوم', weight: 50, planned: 55, actual: 22 },
    ],
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mt16">
      <CardHeader title={title} />
      <CardBody>
        <div className="col g16">{children}</div>
      </CardBody>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col g6">
      <span className="sect-t">{label}</span>
      <div className="row g8 wrap">{children}</div>
    </div>
  );
}

export default function KitPage() {
  const [text, setText] = useState('مجتمع مسکونی نگین شهر');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('table');
  const [tab, setTab] = useState('one');
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [picked, setPicked] = useState('manual');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['1', '2']));
  const [selectedNode, setSelectedNode] = useState<string | null>('22');

  const tableColumns: Array<Column<DemoRow>> = [
    {
      key: 'name',
      header: 'نام پروژه',
      minWidth: 240,
      sortable: true,
      render: (row) => (
        <span className="col">
          <span className="fw6 tx9">{row.name}</span>
          <span className="mono t-xs tx5">{row.code}</span>
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'پیشرفت',
      minWidth: 160,
      render: (row) => <DualProgress planned={row.planned} actual={row.actual} maxWidth={180} />,
    },
    {
      key: 'deviation',
      header: 'انحراف',
      minWidth: 110,
      render: (row) => {
        const d = row.actual - row.planned;
        return (
          <Badge tone={d <= -15 ? 'err' : d < -5 ? 'wrn' : d > 0 ? 'ok' : 'pri'}>
            {formatPercent(d)}
          </Badge>
        );
      },
    },
    {
      key: 'budget',
      header: 'بودجه',
      minWidth: 150,
      render: (row) => <span className="fw6 nowrap">{formatRial(row.budget)}</span>,
    },
    {
      key: 'menu',
      header: '',
      width: 40,
      render: (row) => (
        <Menu
          entries={[
            { key: 'edit', label: 'ویرایش', icon: 'pencil' },
            { key: 'export', label: 'خروجی Excel', icon: 'file-spreadsheet' },
            { key: 'sep', separator: true },
            { key: 'archive', label: 'آرشیو', icon: 'archive', tone: 'warn' },
            {
              key: 'delete',
              label: 'حذف',
              icon: 'trash-2',
              tone: 'danger',
              disabled: true,
              disabledReason: 'این پروژه گزارش تأییدشده دارد',
            },
          ]}
          trigger={(props) => (
            <button {...props} className="ibtn sm" aria-label={`اقدامات ${row.name}`}>
              <Icon name="more-vertical" size={15} />
            </button>
          )}
        />
      ),
    },
  ];

  const treeColumns: Array<Column<DemoNode>> = [
    { key: 'code', header: 'کد', minWidth: 90, render: (n) => <span className="mono t-sm tx6">{n.code}</span> },
    { key: 'weight', header: 'وزن', minWidth: 70, render: (n) => <span className="t-12 fw5">{formatPercent(n.weight)}</span> },
    {
      key: 'progress',
      header: 'پیشرفت واقعی',
      minWidth: 140,
      emphasized: true,
      render: (n) => (
        <span className="row g6">
          <span className="t-sm fw6" style={{ width: 34, color: progressColor(n.planned, n.actual) }}>
            {formatPercent(n.actual)}
          </span>
          <ProgressBar value={n.actual} size="thin" color={progressColor(n.planned, n.actual)} />
        </span>
      ),
    },
  ];

  return (
    <Content>
      <PageHead
        eyebrow="DESIGN SYSTEM"
        title="گالری کامپوننت‌ها"
        subtitle="همهٔ کامپوننت‌های کیت در همهٔ حالت‌ها — ابزار تست چشمی پیاده‌سازی صفحه‌ها"
        actions={
          <>
            <AppButton icon="refresh-cw" onClick={() => toast.info('نمونهٔ پیام اطلاع')}>
              پیام اطلاع
            </AppButton>
            <AppButton
              variant="primary"
              icon="check"
              onClick={() =>
                toast.success('گزارش FR-1404-0309 تأیید شد', {
                  action: { label: 'بازگردانی', onClick: () => toast.info('بازگردانی شد') },
                })
              }
            >
              پیام موفقیت
            </AppButton>
            <AppButton variant="dangerOutline" icon="x" onClick={() => toast.error('ذخیره انجام نشد؛ اتصال قطع شد')}>
              پیام خطا
            </AppButton>
          </>
        }
      />

      <Section title="دکمه‌ها">
        <Row label="واریانت‌ها">
          <AppButton variant="primary" icon="plus">پروژهٔ جدید</AppButton>
          <AppButton variant="outline" icon="upload">ورود از MSP</AppButton>
          <AppButton variant="ghost" icon="filter">فیلترها</AppButton>
          <AppButton variant="success" icon="check">تأیید</AppButton>
          <AppButton variant="accent" icon="send">ارسال</AppButton>
          <AppButton variant="danger" icon="trash-2">حذف</AppButton>
          <AppButton variant="dangerOutline" icon="x">رد</AppButton>
          <AppButton variant="primary" disabled>غیرفعال</AppButton>
        </Row>
        <Row label="اندازه‌ها و حالت در حال انجام">
          <AppButton size="lg" variant="primary" trailingIcon="arrow-left">ورود به سیستم</AppButton>
          <AppButton size="md" variant="outline">متوسط</AppButton>
          <AppButton size="sm" variant="outline">کوچک</AppButton>
          <AppButton size="xs" variant="outline">ریز</AppButton>
          <AppButton variant="primary" loading>در حال ثبت ریسک…</AppButton>
          <AppButton variant="outline" size="sm" loading>در حال ساخت PDF…</AppButton>
          <LinkButton to="/_kit" variant="outline" icon="external-link">پیوند دکمه‌ای</LinkButton>
        </Row>
        <Row label="دکمهٔ آیکنی">
          <IconButton icon="search" label="جستجو" />
          <IconButton icon="bell" label="اعلان‌ها" ping />
          <IconButton icon="more-vertical" label="بیشتر" bordered />
          <IconButton icon="pencil" label="ویرایش" size="sm" />
          <Tooltip content="خروجی Excel">
            <IconButton icon="file-spreadsheet" label="خروجی Excel" bordered />
          </Tooltip>
          <Kbd>Ctrl+K</Kbd>
        </Row>
      </Section>

      <Section title="نشان‌ها، آواتار و برچسب هزینه">
        <Row label="نشان وضعیت">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone} dot>
              {tone}
            </Badge>
          ))}
        </Row>
        <Row label="نشان کوچک، قرص‌شکل، مونو و تغییر">
          <Badge size="sm" tone="err" icon="alert-triangle">Σ ۹۵٪</Badge>
          <Badge pill tone="inf">۲۳</Badge>
          <Badge mono tone="neu">FR-1404-0312</Badge>
          <Delta tone="ok" direction="up">۳٪</Delta>
          <Delta tone="err" direction="up">۱</Delta>
        </Row>
        <Row label="آواتار و مربع آیکن">
          <Avatar name="مهندس احمدی" size="s" />
          <Avatar name="علی محمدی" />
          <Avatar name="حسن کریمی" size="m" />
          <Avatar name="امیر صادقی" size="l" />
          <AvatarGroup
            people={[
              { name: 'علی محمدی' },
              { name: 'حسن کریمی' },
              { name: 'رضا اکبری' },
              { name: 'مهدی نوری' },
              { name: 'سعید قاسمی' },
              { name: 'امیر صادقی' },
            ]}
          />
          <IconBox icon="folder-kanban" tone="pri" />
          <IconBox icon="alert-triangle" tone="err" size="lg" />
          <IconBox tone="err" size="sm">۲۰</IconBox>
        </Row>
        <Row label="نوع هزینهٔ CBS">
          <CostTypeTag type="materials" />
          <CostTypeTag type="labor" />
          <CostTypeTag type="equipment" />
          <CostTypeTag type="subcontract" />
          <CostTypeTag type="overhead" />
          <CostTypeTag type="transport" />
        </Row>
      </Section>

      <Section title="کارت، KPI و نوار آمار">
        <div className="grid c4">
          <KpiCard label="پروژه‌های فعال" value={toFaDigits(8)} icon="folder-kanban" tone="pri" delta={<Delta tone="ok">۱</Delta>} hint="از ۱۲ پروژه" />
          <KpiCard label="گزارش‌های در انتظار" value={toFaDigits(23)} icon="clock" tone="inf" hint="۵ مورد بیش از ۴۸ ساعت" />
          <KpiCard label="پروژه‌های در خطر" value={toFaDigits(3)} icon="alert-triangle" tone="err" valueClassName="tx-err" hint="بیش از ۱۵٪ عقب از برنامه" />
          <KpiCard layout="inline" label="آیتم در انتظار · در ۲۴ گزارش" value={toFaDigits(87)} icon="layers" tone="inf" valueClassName="tx-inf" />
        </div>
        <StatStrip columns={4}>
          <Stat icon="folder" label="مجموع پروژه‌ها" value={toFaDigits(12)} hint="۸ فعال · ۲ متوقف" />
          <Stat icon="trending-up" iconClassName="tx-ok" label="میانگین پیشرفت" value={formatPercent(52)} delta={<Delta tone="ok">۳٪</Delta>} hint="نسبت به ماه گذشته" />
          <Stat icon="banknote" iconClassName="tx-acc" label="بودجهٔ کل" value={toFaDigits('19٬050')} unit="میلیارد ریال" hint="مصرف‌شده: ۵۲٪" />
          <Stat icon="alert-triangle" iconClassName="tx-err" label="در خطر" value={toFaDigits(2)} valueClassName="tx-err" hint="انحراف بیش از ۱۵٪" />
        </StatStrip>
        <div className="grid c2">
          <Card>
            <CardHeader title="اقلام CBS متصل" icon="link-2" action={<a className="link" href="/_kit">مدیریت</a>} />
            <CardBody>
              <KeyValueGrid columns={2}>
                <KeyValue label="وزن در والد" value={formatPercent(50)} />
                <KeyValue label="مقدار کل" value="۱٬۴۵۰ مترمربع" />
                <KeyValue label="سرپرست" value={<span className="row g6"><Avatar name="امیر صادقی" size="s" />امیر صادقی</span>} />
                <KeyValue label="پایان برنامه‌ای" value="۱۴۰۴/۰۳/۰۵" />
              </KeyValueGrid>
              <Box className="mt12">
                <div className="row between t-12 tx7">
                  <span className="row g6"><Icon name="percent" size={13} />مجموع وزن ریشه</span>
                  <strong className="num-i tx-ok row g4">{formatPercent(100)}<Icon name="check" size={13} /></strong>
                </div>
              </Box>
            </CardBody>
            <CardFooter>
              <span className="t-sm tx6">امتیاز = احتمال × اثر (۱ تا ۲۵)</span>
              <a className="link" href="/_kit">ماتریس ریسک</a>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader title="پیشرفت و راهنما" icon="line-chart" iconClassName="tx-pri" />
            <CardBody>
              <div className="col g12">
                <div className="col g4">
                  <div className="row between t-sm tx6"><span>برنامه‌ای امروز</span><strong className="num-i tx9">{formatPercent(55)}</strong></div>
                  <ProgressBar value={55} color="#A1A1AA" label="برنامه‌ای" />
                  <div className="row between t-sm tx6"><span>واقعی</span><strong className="num-i tx-err">{formatPercent(22)}</strong></div>
                  <ProgressBar value={22} color="#DC2626" label="واقعی" />
                </div>
                <ProgressBar value={68} size="xl" marker={80} label="مصرف بودجه" />
                <Legend
                  entries={[
                    { label: 'برنامه‌ای', color: '#8AA2C2', shape: 'dash' },
                    { label: 'واقعی', color: '#1A3354', thickness: 4 },
                    { label: 'پیش‌بینی', color: '#A1A1AA', shape: 'dash' },
                    { label: 'تأخیر بحرانی', color: '#DC2626', shape: 'square' },
                  ]}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="فرم‌ها">
        <div className="grid c2">
          <FormField label="نام پروژه" required hint="در گزارش ماهانهٔ کارفرما چاپ می‌شود">
            <TextInput value={text} onChange={(event) => setText(event.target.value)} />
          </FormField>
          <FormField label="کد پروژه" hint="کد پس از ایجاد پروژه قابل تغییر نیست">
            <TextInput value="PRJ-1404-021" readOnly readOnlyLook ltr />
          </FormField>
          <FormField label="بودجهٔ کل" success="با جمع اقلام CBS برابر است">
            <TextInput defaultValue="۸۵۰" suffix="میلیارد ریال" />
          </FormField>
          <FormField label="شمارهٔ موبایل" error="شمارهٔ موبایل باید با ۰۹ شروع شود">
            <TextInput defaultValue="۰۸۱۲۳۴۵۶۷۸۹" ltr icon="phone" />
          </FormField>
          <FormField label="وضعیت پروژه">
            <Select
              value={status}
              onChange={setStatus}
              prefix="وضعیت"
              options={[
                { value: 'all', label: 'همه', text: 'همه' },
                { value: 'active', label: 'فعال', text: 'فعال', icon: 'check-circle-2' },
                { value: 'paused', label: 'متوقف', text: 'متوقف' },
                { value: 'done', label: 'تمام‌شده', text: 'تمام‌شده' },
                { value: 'archived', label: 'آرشیو', text: 'آرشیو', disabled: true },
              ]}
            />
          </FormField>
          <FormField label="روش محاسبهٔ پیشرفت" optional>
            <SegmentedControl
              activeKey={view}
              onChange={setView}
              items={[
                { key: 'table', label: 'جدول', icon: 'list' },
                { key: 'cards', label: 'کارت', icon: 'layout-grid' },
              ]}
            />
          </FormField>
          <FormField label="توضیحات" optional dirty full>
            <TextArea defaultValue="احداث مجتمع مسکونی ۸ بلوکه شامل ۲۴۰ واحد در منطقهٔ ۲۲ تهران." />
          </FormField>
        </div>

        <Row label="کنترل‌های انتخاب">
          <Checkbox label="مرا به خاطر بسپار" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <Checkbox label="حالت میانی" indeterminate onChange={() => undefined} />
          <Radio name="kit-radio" label="وزن دستی" checked={picked === 'manual'} onChange={() => setPicked('manual')} />
          <Radio name="kit-radio" label="از هزینه" checked={picked === 'cost'} onChange={() => setPicked('cost')} />
          <span className="row g8">
            <Switch checked={switched} onChange={setSwitched} label="در محاسبهٔ زمان‌بندی" />
            <span className="t-13">در محاسبهٔ زمان‌بندی</span>
          </span>
        </Row>

        <Row label="تراشه و روزهای کاری">
          <Chip icon="alert-triangle" selected onClick={() => undefined}>فقط مشکوک (۴)</Chip>
          <Chip onRemove={() => undefined}>نوع: ساختمانی</Chip>
          <Chip selected>شنبه</Chip>
          <Chip dashed title="نیم‌روز">پنجشنبه<span className="t-xs">نیم‌روز</span></Chip>
          <Chip>جمعه</Chip>
        </Row>

        <div className="grid c2">
          <OptionCard
            title="وزن دستی"
            description="وزن هر آیتم را خودتان تعیین می‌کنید؛ مجموع فرزندان باید ۱۰۰٪ باشد."
            selected={picked === 'manual'}
            onSelect={() => setPicked('manual')}
            name="kit-option"
          />
          <OptionCard
            title="از هزینه"
            description="وزن از سهم بودجهٔ هر آیتم در CBS محاسبه می‌شود."
            selected={picked === 'cost'}
            onSelect={() => setPicked('cost')}
            name="kit-option"
          />
        </div>

        <Stepper
          current={2}
          steps={[
            { key: '1', label: 'اطلاعات پایه' },
            { key: '2', label: 'زمان و بودجه' },
            { key: '3', label: 'تیم' },
            { key: '4', label: 'ساختار' },
          ]}
        />
      </Section>

      <Section title="زبانه‌ها، جدول و درخت">
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'one', label: 'در انتظار', count: 24, countTone: 'neu' },
            { key: 'two', label: 'تأییدشده', count: 128 },
            { key: 'three', label: 'نیاز اصلاح', count: 3, countTone: 'w' },
            { key: 'four', label: 'رد شده', count: 8, countTone: 'e' },
          ]}
        />

        <Card>
          <DataTable
            rows={DEMO_ROWS}
            columns={tableColumns}
            getRowId={(row) => row.id}
            minWidth={900}
            sort={{ by: 'name', dir: 'asc' }}
            onSortChange={() => undefined}
            footer={
              <Pagination
                page={page}
                pageSize={pageSize}
                total={12}
                unit="پروژه"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            }
          />
        </Card>

        <Card style={{ height: 420, display: 'flex', flexDirection: 'column' }}>
          <Workspace
            minHeight={360}
            toolbar={
              <div className="col g8">
                <span className="sect-t">فیلترها</span>
                <Select size="sm" value="all" onChange={() => undefined} options={[{ value: 'all', label: 'همه', text: 'همه' }]} label="وضعیت" />
                <SegmentedControl fill activeKey="all" items={[{ key: 'all', label: 'همه' }, { key: 'leaf', label: 'برگ‌ها' }]} />
              </div>
            }
            detail={
              <div className="col g8 p16">
                <Badge mono tone="neu" icon="file-text">1.2.3</Badge>
                <h2 className="h-t3">قالب‌بندی سقف طبقهٔ دوم</h2>
                <Badge tone="err" dot>تأخیر بحرانی</Badge>
                <p className="t-12 tx6 lh">تأخیر اصلی به دلیل دیر رسیدن ورق فولادی قالب است.</p>
              </div>
            }
          >
            <WorkspaceToolbar>
              <span className="grow t-sm tx5">مسیر: <span className="mono">1.2.3</span></span>
              <AppButton size="sm" variant="ghost" icon="chevrons-up-down">گسترش همه</AppButton>
              <AppButton size="sm" variant="primary" icon="plus">آیتم جدید</AppButton>
            </WorkspaceToolbar>
            <WorkspaceScroll>
              <TreeTable
                nodes={DEMO_TREE}
                minWidth={700}
                expandedIds={expanded}
                onToggleExpand={(id) =>
                  setExpanded((previous) => {
                    const next = new Set(previous);
                    if (next.has(String(id))) next.delete(String(id));
                    else next.add(String(id));
                    return next;
                  })
                }
                selectedId={selectedNode}
                onSelect={(node) => setSelectedNode(node.id)}
                rowStatusClass={(node) => PROGRESS_STATUS_ROW_CLASS[progressStatus(node.planned, node.actual)]}
                isLate={(node) => progressStatus(node.planned, node.actual) === 'late'}
                titleColumn={{
                  header: 'عنوان',
                  title: (node) => node.title,
                  badges: (node) =>
                    node.code === '1.2' ? (
                      <Badge size="sm" tone="err" icon="alert-triangle" title="مجموع وزن فرزندان ۸۰٪ است">
                        Σ ۸۰٪
                      </Badge>
                    ) : null,
                }}
                columns={treeColumns}
              />
            </WorkspaceScroll>
          </Workspace>
        </Card>
      </Section>

      <Section title="هشدار، مودال، منو و خط زمان">
        <div className="col g8">
          <Alert tone="inf">با تغییر تقویم، تاریخ‌های پیش‌بینی در WBS و منحنی S دوباره محاسبه می‌شود.</Alert>
          <Alert tone="wrn" action={<AppButton size="sm" icon="refresh-cw">بررسی دوباره</AppButton>}>
            <strong>اتصال اینترنت قطع است</strong> — تغییرات شما نگه داشته می‌شود و پس از اتصال ذخیره می‌شود.
          </Alert>
          <Alert tone="err">مجموع وزن فرزندان این آیتم ۹۵٪ است و باید ۱۰۰٪ باشد.</Alert>
          <Alert tone="ok">گزارش با موفقیت تأیید شد و پیشرفت WBS به‌روز شد.</Alert>
        </div>

        <Row label="مودال و منو">
          <AppButton variant="primary" onClick={() => setModalOpen(true)}>باز کردن مودال</AppButton>
        </Row>

        <div className="grid c2">
          <div>
            <span className="sect-t">منوی سه‌نقطه</span>
            <div className="mt8">
              <MenuList
                entries={[
                  { key: 'g1', group: 'آیتم' },
                  { key: 'edit', label: 'ویرایش آیتم', icon: 'pencil', trailing: <Kbd>E</Kbd> },
                  { key: 'child', label: 'افزودن زیرآیتم', icon: 'corner-down-right' },
                  { key: 'sep1', separator: true },
                  { key: 'approve', label: 'تأیید گزارش', icon: 'check', tone: 'good', trailing: <Kbd>A</Kbd> },
                  { key: 'revise', label: 'درخواست اصلاح', icon: 'rotate-ccw', tone: 'warn' },
                  { key: 'sep2', separator: true },
                  { key: 'del', label: 'حذف', icon: 'trash-2', tone: 'danger', disabled: true, disabledReason: 'این آیتم ۴ گزارش دارد' },
                ]}
              />
            </div>
          </div>
          <div>
            <span className="sect-t">خط زمان فعالیت</span>
            <Card className="mt8">
              <Timeline
                entries={[
                  { id: '1', icon: 'clipboard', tone: 'inf', text: <><strong>علی محمدی</strong> گزارشی در <span className="q">مجتمع نگین شهر</span> ثبت کرد</>, time: '۳۰ دقیقه پیش' },
                  { id: '2', icon: 'play', tone: 'ok', text: <>پروژهٔ <span className="q">پل شهید سلیمانی</span> دوباره فعال شد</>, time: '۱ ساعت پیش' },
                  { id: '3', icon: 'shield-alert', tone: 'wrn', text: <>ریسک «تأخیر تحویل ورق» به سطح <strong>بالا</strong> رسید</>, time: 'دیروز · ۱۰:۱۲' },
                ]}
              />
            </Card>
          </div>
        </div>

        <Row label="عکس گزارش">
          <PhotoThumb photo={{ id: '1', alt: 'بتن‌ریزی فونداسیون', tag: '۰۹:۱۴' }} />
          <PhotoThumb photo={{ id: '2', alt: 'آرماتوربندی' }} moreCount={2} />
          <PhotoThumb photo={{ id: '3', alt: 'قالب‌بندی' }} width={96} />
        </Row>
      </Section>

      <Section title="حالت‌های سیستم">
        <div className="grid c3" style={{ alignItems: 'start' }}>
          <EmptyState
            inCard
            icon="compass"
            title="این صفحه پیدا نشد"
            description="ممکن است نشانی تغییر کرده یا پروژه بایگانی شده باشد."
            actions={<AppButton variant="primary" size="sm">رفتن به داشبورد</AppButton>}
          />
          <EmptyState
            inCard
            icon="server"
            iconStyle={{ background: '#FEE2E2', color: '#B91C1C' }}
            title="بارگذاری این بخش انجام نشد"
            description="مشکل از سمت ماست و داده‌های شما سالم است."
            footnote={<>کد پیگیری: <span className="mono">ERR-7F3A-21</span></>}
            actions={<AppButton variant="primary" size="sm" icon="refresh-cw">تلاش دوباره</AppButton>}
          />
          <EmptyState
            inCard
            icon="lock"
            iconStyle={{ background: '#FEF0C7', color: '#B45309' }}
            title="این بخش برای نقش شما باز نیست"
            description="ویرایش CBS به نقش برنامه‌ریز یا مدیر پروژه نیاز دارد."
            actions={<AppButton variant="primary" size="sm" icon="send">درخواست دسترسی</AppButton>}
          />
        </div>

        <div className="col g12">
          <span className="sect-t">بارگذاری</span>
          <InlineLoading />
          <SkeletonKpiRow />
          <Card><CardBody><SkeletonTable /></CardBody></Card>
          <div className="row g8">
            <Skeleton width={120} height={10} />
            <Skeleton width={40} height={22} />
            <Skeleton width={28} height={28} circle />
          </div>
        </div>
      </Section>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="ثبت ریسک جدید"
        description="ریسک در دفتر ریسک پروژه ثبت می‌شود و به مالک انتخابی اعلان می‌رود."
        size="md"
        footer={
          <>
            <AppButton variant="ghost" onClick={() => setModalOpen(false)}>لغو</AppButton>
            <AppButton variant="primary" icon="shield-alert" onClick={() => { setModalOpen(false); toast.success('ریسک ثبت شد'); }}>
              ثبت ریسک
            </AppButton>
          </>
        }
      >
        <FormField label="عنوان ریسک" required>
          <TextInput placeholder="مثلاً تأخیر تحویل ورق فولادی سقف" />
        </FormField>
        <div className="grid c2">
          <FormField label="احتمال">
            <Select
              value={3}
              onChange={() => undefined}
              label="احتمال"
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: toFaDigits(n), text: toFaDigits(n) }))}
            />
          </FormField>
          <FormField label="اثر">
            <Select
              value={4}
              onChange={() => undefined}
              label="اثر"
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: toFaDigits(n), text: toFaDigits(n) }))}
            />
          </FormField>
        </div>
        <Alert tone="wrn">امتیاز این ریسک ۱۲ (متوسط) است. ریسک ۱۵ به بالا اعلان فوری می‌گیرد.</Alert>
      </Modal>
    </Content>
  );
}
