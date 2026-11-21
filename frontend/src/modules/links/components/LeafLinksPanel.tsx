import { useMemo, useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatPercentAuto, formatQuantity, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { CBS_DEEP_LINKS, ROUTES } from '@/config/routes';
import { CommitInput } from '@/modules/plan/components/EditFields';
import { parseNumber } from '@/modules/plan/services/parseNumber';
import type { PlanValidationIssue } from '@/modules/plan/types';
import { Money } from '@/modules/cbs/components/Money';
import type { LinkCbsOptionDto, LinkLeafDto, LinkOp, LinkRowDto, LinksViewDto } from '../types';
import { CbsItemPicker } from './CbsItemPicker';

export interface LeafLinksPanelProps {
  view: LinksViewDto;
  projectId: EntityId;
  leaf: LinkLeafDto;
  path: LinkLeafDto[];
  canEdit: boolean;
  canViewAmounts: boolean;
  /** خطاهای V-08 قلم‌هایی که این برگ به آن‌ها وصل است. */
  issues: PlanValidationIssue[];
  onOp: (op: LinkOp) => void;
  onCopy: () => void;
  onShowUnlinked: () => void;
}

type Row = LinkRowDto & { item: LinkCbsOptionDto };

const digits = (text: string) =>
  text.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[^\d]/g, '');

/**
 * بخش اصلی W15 برای برگ انتخاب‌شده (بوم): مشخصات، زیربودجه، سهم و تعادل (۵.۳)،
 * جدول اقلام متصل با مقدار یا مبلغ درجا (G15)، ردیف افزودن، و هشدار برگ‌های بی‌اتصال.
 * «پیشنهاد از فعالیت‌های مشابه» فاز دوم است و نمایش داده نمی‌شود (cbs.md ۵.۴).
 */
export function LeafLinksPanel({
  view,
  projectId,
  leaf,
  path,
  canEdit,
  canViewAmounts,
  issues,
  onOp,
  onCopy,
  onShowUnlinked,
}: LeafLinksPanelProps) {
  const itemsById = useMemo(
    () => new Map(view.cbsItems.map((item) => [item.id, item])),
    [view.cbsItems],
  );
  const rows: Row[] = useMemo(
    () =>
      view.links
        .filter((link) => link.wbsItemId === leaf.id)
        .flatMap((link) =>
          itemsById.has(link.cbsItemId) ? [{ ...link, item: itemsById.get(link.cbsItemId)! }] : [],
        ),
    [view.links, leaf.id, itemsById],
  );
  const linkedIds = useMemo(() => new Set(rows.map((row) => row.cbsItemId)), [rows]);

  const [pick, setPick] = useState<EntityId | null>(null);
  const [amount, setAmount] = useState('');
  const picked = pick ? (itemsById.get(pick) ?? null) : null;
  const pickedLump = picked?.pricingMode === 'lump_sum';
  const amountValid = picked
    ? pickedLump
      ? Boolean(digits(amount)) && BigInt(digits(amount)) > 0n
      : (parseNumber(amount) ?? 0) > 0
    : false;

  function add() {
    if (!picked || !amountValid) return;
    onOp(
      pickedLump
        ? { type: 'link', wbsItemId: leaf.id, cbsItemId: picked.id, amount: digits(amount) }
        : {
            type: 'link',
            wbsItemId: leaf.id,
            cbsItemId: picked.id,
            quantity: parseNumber(amount)!,
          },
    );
    setPick(null);
    setAmount('');
  }

  /** «ویرایش مقدار» در منوی ردیف: ویرایش درجا است، پس فقط همان خانه فوکوس می‌گیرد. */
  function focusAmount(cbsItemId: EntityId) {
    const input = document.querySelector<HTMLInputElement>(
      `[data-link-amount="${cbsItemId}"] input`,
    );
    if (!input) return;
    input.focus();
    input.select();
  }

  const columns: Array<Column<Row>> = [
    {
      key: 'type',
      header: 'نوع هزینه',
      minWidth: 100,
      render: (row) => <CostTypeTag type={row.item.costType} />,
    },
    {
      key: 'code',
      header: 'کد',
      minWidth: 72,
      render: (row) => (
        <span className="mono t-sm tx5" dir="ltr">
          {row.item.code}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'عنوان',
      minWidth: 150,
      render: (row) => (
        <span className="row g6">
          <span className="fw5 tx9">{row.item.title}</span>
          {row.change === 'added' && (
            <Badge size="sm" tone="ok">
              جدید
            </Badge>
          )}
          {row.change === 'changed' && (
            <Badge size="sm" tone="wrn">
              تغییر
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'مقدار یا مبلغ',
      minWidth: 200,
      render: (row) => (
        <span data-link-amount={row.cbsItemId}>
          {row.item.pricingMode === 'lump_sum' ? (
          canViewAmounts ? (
            <span className="row g4 nowrap">
              <span style={{ width: 140, flex: '0 0 auto' }}>
                <CommitInput
                  key={`a:${row.cbsItemId}:${row.amount}`}
                  value={row.amount ?? ''}
                  ltr
                  disabled={!canEdit}
                  onCommit={(text) =>
                    digits(text) &&
                    onOp({
                      type: 'setAmount',
                      wbsItemId: leaf.id,
                      cbsItemId: row.cbsItemId,
                      amount: digits(text),
                    })
                  }
                />
              </span>
              <span className="t-sm tx5">ریال</span>
            </span>
          ) : (
            <span className="tx5">مقطوع</span>
          )
        ) : (
          <span className="row g4 nowrap">
            <span style={{ width: 96, flex: '0 0 auto' }}>
              <CommitInput
                key={`q:${row.cbsItemId}:${row.quantity}`}
                value={
                  row.quantity == null ? '' : toFaDigits(String(row.quantity)).replace('.', '٫')
                }
                disabled={!canEdit}
                onCommit={(text) => {
                  const quantity = parseNumber(text);
                  if (quantity !== null && quantity > 0)
                    onOp({
                      type: 'setQuantity',
                      wbsItemId: leaf.id,
                      cbsItemId: row.cbsItemId,
                      quantity,
                    });
                }}
              />
            </span>
              <span className="t-sm tx5">{row.item.unit}</span>
            </span>
          )}
        </span>
      ),
    },
  ];
  if (canViewAmounts) {
    columns.push(
      {
        key: 'rate',
        header: 'نرخ واحد',
        minWidth: 90,
        render: (row) =>
          row.item.unitRate ? (
            <Money value={row.item.unitRate} short />
          ) : (
            <span className="tx5">—</span>
          ),
      },
      {
        key: 'sub',
        header: 'زیربودجه',
        minWidth: 96,
        emphasized: true,
        render: (row) => <Money value={row.subBudget} short className="t-12 fw6 tx9" />,
      },
    );
  }
  columns.push({
    key: 'share',
    header: 'سهم',
    minWidth: 56,
    render: (row) => (
      <span className="t-12 tx6">
        {row.sharePercent == null ? '—' : formatPercentAuto(row.sharePercent)}
      </span>
    ),
  });
  // منوی ردیف اتصال (بوم W45): خواندنی‌ها همیشه، ویرایش و حذف فقط در نسخهٔ کاری
  columns.push({
    key: 'actions',
    header: <span className="sr-input">اقدامات</span>,
    width: 48,
    render: (row) => {
      const entries: MenuEntry[] = [
        {
          key: 'budget',
          label: 'مشاهدهٔ اثر بر بودجه',
          icon: 'bar-chart-3',
          note: `قلم ${row.item.code}`,
          to: ROUTES.cbsItem(projectId, row.cbsItemId),
        },
        { key: 'trend', label: 'روند مصرف قلم', icon: 'line-chart', to: CBS_DEEP_LINKS.costTrend(projectId, row.cbsItemId) },
      ];

      if (canEdit) {
        entries.push(
          { key: 'sep-edit', separator: true },
          {
            key: 'edit',
            label: 'ویرایش مقدار',
            icon: 'pencil',
            trailing: 'E',
            note: 'مقدار یا مبلغ را در همین جدول بنویسید',
            onSelect: () => focusAmount(row.cbsItemId),
          },
          { key: 'copy', label: 'کپی اتصال‌ها به آیتم دیگر', icon: 'copy', onSelect: onCopy },
          { key: 'sep-danger', separator: true },
          {
            key: 'unlink',
            label: 'حذف اتصال',
            icon: 'unlink-2',
            tone: 'danger',
            onSelect: () => onOp({ type: 'unlink', wbsItemId: leaf.id, cbsItemId: row.cbsItemId }),
          },
        );
      }

      return (
        <Menu
          align="start"
          entries={entries}
          trigger={(props) => <IconButton {...props} icon="more-vertical" label={`گزینه‌های اتصال ${row.item.title}`} size="sm" />}
        />
      );
    },
  });

  return (
    <div className="col g14" style={{ padding: '18px 20px' }}>
      <div className="col g6">
        {path.length > 0 && (
          <nav className="row wrap g4 t-sm tx5" aria-label="مسیر فعالیت">
            {path.map((entry, index) => (
              <span key={entry.id} className="row g4">
                {index > 0 && <Icon name="chevron-left" size={12} />}
                {entry.title}
              </span>
            ))}
          </nav>
        )}
        <div className="row between ai-s wrap g12">
          <div className="col g6">
            <h1 className="h-t2">{leaf.title}</h1>
            <div className="meta">
              <span>
                <Icon name="hash" size={13} />
                <strong className="mono" dir="ltr">
                  {leaf.code}
                </strong>
              </span>
              {leaf.totalQuantity != null && (
                <span>
                  <Icon name="box" size={13} />
                  مقدار: <strong>{formatQuantity(leaf.totalQuantity, leaf.unit)}</strong>
                </span>
              )}
              <span>
                <Icon name="percent" size={13} />
                وزن در پروژه: <strong>{formatPercentAuto(leaf.weightInProject, 2)}</strong>
              </span>
              {leaf.supervisorName && (
                <span>
                  <Icon name="hard-hat" size={13} />
                  سرپرست: <strong>{leaf.supervisorName}</strong>
                </span>
              )}
            </div>
          </div>
          {canEdit && rows.length > 0 && (
            <AppButton variant="outline" size="sm" icon="copy" onClick={onCopy}>
              کپی اتصالات به…
            </AppButton>
          )}
        </div>
      </div>

      <Card
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}
      >
        {canViewAmounts && (
          <div
            className="col g4"
            style={{ padding: '14px 18px', borderInlineEnd: '1px solid #F4F4F5' }}
          >
            <span className="t-sm tx5 row g4">
              <Icon name="calculator" size={12} />
              زیربودجهٔ این فعالیت (BAC)
            </span>
            <Money value={leaf.bac} className="stat-v" />
            <span className="t-sm tx5">جمع {toFaDigits(rows.length)} قلم CBS متصل</span>
          </div>
        )}
        <div
          className="col g4"
          style={{ padding: '14px 18px', borderInlineEnd: '1px solid #F4F4F5' }}
        >
          <span className="t-sm tx5">سهم از بودجهٔ پروژه</span>
          <span className="stat-v">
            {leaf.budgetSharePercent == null ? '—' : formatPercentAuto(leaf.budgetSharePercent, 2)}
          </span>
          <span className="t-sm tx5">وزن WBS: {formatPercentAuto(leaf.weightInProject, 2)}</span>
        </div>
        <div className="col g4" style={{ padding: '14px 18px' }}>
          <span className="t-sm tx5">تعادل وزن و بودجه</span>
          {rows.length === 0 ? (
            <Badge tone="acc" icon="alert-circle" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              بدون بودجه
            </Badge>
          ) : leaf.balanced ? (
            <Badge
              tone="ok"
              icon="check-circle-2"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              متعادل با وزن WBS
            </Badge>
          ) : (
            <Badge
              tone={(leaf.balanceDiff ?? 0) > 1 ? 'wrn' : 'neu'}
              icon="scale"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              اختلاف {formatPercentAuto(leaf.balanceDiff ?? 0, 2)}
            </Badge>
          )}
          <span className="t-sm tx5">
            متعادل یعنی اختلاف کمتر از ۰٫۱ واحد درصد؛ خطا نیست (۵.۳).
          </span>
        </div>
      </Card>

      <Card overflowVisible>
        <CardHeader
          title="اقلام CBS متصل"
          icon="link-2"
          subtitle={
            canEdit ? 'مقدار یا مبلغ را در جدول ویرایش کنید؛ زیربودجه را سرور می‌سازد' : undefined
          }
        />
        {rows.length > 0 ? (
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(row) => row.cbsItemId}
            minWidth={canViewAmounts ? 820 : 560}
            caption={`اقلام CBS متصل به ${leaf.title}`}
          />
        ) : (
          <div className="col g4" style={{ padding: '14px 18px' }}>
            <span className="t-13 tx7">
              این فعالیت به هیچ قلم CBS وصل نیست؛ BAC و EV آن صفر می‌ماند (AL-STR-01).
            </span>
          </div>
        )}
        {canEdit && (
          <div
            className="row wrap g8"
            style={{ padding: '10px 18px', background: '#F8FAFD', borderTop: '1px solid #F4F4F5' }}
          >
            <span className="tx-pri" style={{ display: 'inline-flex' }}>
              <Icon name="plus-circle" size={15} />
            </span>
            <CbsItemPicker
              options={view.cbsItems}
              excludedIds={linkedIds}
              value={pick}
              onChange={setPick}
              disabled={rows.length >= 20}
            />
            <TextInput
              size="sm"
              aria-label={
                pickedLump
                  ? 'مبلغ اتصال تازه (ریال)'
                  : `مقدار اتصال تازه${picked?.unit ? ` (${picked.unit})` : ''}`
              }
              placeholder={
                pickedLump ? 'مبلغ (ریال)' : picked?.unit ? `مقدار (${picked.unit})` : 'مقدار'
              }
              ltr={pickedLump}
              value={amount}
              disabled={!picked}
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && add()}
              style={{ width: 130 }}
            />
            <AppButton
              variant="primary"
              size="xs"
              className="ms-auto"
              disabled={!amountValid}
              onClick={add}
            >
              افزودن اتصال
            </AppButton>
            {rows.length >= 20 && <span className="hint">هر فعالیت حداکثر ۲۰ اتصال دارد.</span>}
          </div>
        )}
        {canViewAmounts && rows.length > 0 && (
          <div className="card-f">
            <span className="t-12 tx6">جمع زیربودجه</span>
            <Money value={leaf.bac} className="stat-v" />
          </div>
        )}
      </Card>

      {issues.length > 0 && (
        <Alert tone="err" icon="alert-octagon">
          <span className="col g4">
            {issues.map((issue, index) => (
              <span key={index}>{issue.message}</span>
            ))}
          </span>
        </Alert>
      )}

      {view.summary.unlinkedCount > 0 && (
        <Alert tone="wrn" icon="alert-triangle">
          <span className="col g6">
            <span>
              <strong>{toFaDigits(view.summary.unlinkedCount)} فعالیت برگ</strong> هنوز به CBS متصل
              نیستند؛ پیشرفت هزینه‌ای و EVM آن‌ها محاسبه نمی‌شود.
            </span>
            <AppButton
              variant="outline"
              size="xs"
              style={{ alignSelf: 'flex-start' }}
              onClick={onShowUnlinked}
            >
              نمایش فعالیت‌های بدون اتصال
            </AppButton>
          </span>
        </Alert>
      )}
    </div>
  );
}
