import { useEffect, useMemo, useState } from 'react';

import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { PageHead } from '@/shared/components/ui/PageHead';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatJalaliDate } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import {
  useArchiveTemplateMutation,
  useDeleteTemplateMutation,
  useGetTemplateQuery,
  useGetTemplatesQuery,
  usePublishTemplateMutation,
  useSetDefaultTemplateMutation,
} from '../api/templatesApi';
import { ImportTemplateDialog } from '../components/ImportTemplateDialog';
import { PublishDialog, ValidationDialog } from '../components/TemplateDialogs';
import { TemplatePanel } from '../components/TemplatePanel';
import type { TemplateListItemDto } from '../types';

type Dialog = { kind: 'import' } | { kind: 'validate' } | { kind: 'publish' } | { kind: 'delete' } | { kind: 'archive'; archived: boolean } | null;

function TemplateCardRow({
  template,
  selected,
  onSelect,
}: {
  template: TemplateListItemDto;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card row ai-s g12"
      style={{
        padding: '12px 14px',
        textAlign: 'start',
        cursor: 'pointer',
        borderColor: selected ? 'var(--primary-600, #2C4A73)' : undefined,
        boxShadow: selected ? '0 0 0 1px var(--primary-600, #2C4A73)' : undefined,
      }}
      aria-pressed={selected}
    >
      <IconBox icon={template.icon} tone={selected ? 'pri' : 'neu'} />
      <span className="col grow" style={{ gap: 3, minWidth: 0 }}>
        <span className="row g6 wrap">
          <span className="t-13 fw6 tx9 trunc">{template.name}</span>
          {template.status === 'draft' && <Badge size="sm">پیش‌نویس</Badge>}
          {template.status === 'archived' && (
            <Badge size="sm" icon="archive">
              بایگانی‌شده
            </Badge>
          )}
          {template.isDefaultForType && (
            <Badge size="sm" tone="ok" icon="star" title={`پیش‌فرض ${template.projectTypeName}`}>
              پیش‌فرض
            </Badge>
          )}
        </span>
        <span className="t-xs tx5 trunc">
          {template.originNote ??
            `${template.projectTypeName} · ${template.version ? `نسخهٔ ${toFaDigits(template.version)}` : 'بی‌نسخه'} · ${formatJalaliDate(template.lastChangedAt)}`}
        </span>
        <span className="row g8 t-xs tx6 wrap">
          <span className="row g4">
            <Icon name="git-branch" size={12} />
            {`${toFaDigits(template.wbsCount)} آیتم`}
          </span>
          <span className="row g4">
            <Icon name="banknote" size={12} />
            {`${toFaDigits(template.cbsCount)} قلم`}
          </span>
          <span className="row g4">
            <Icon name="folder-kanban" size={12} />
            {template.usedInProjects > 0 ? `${toFaDigits(template.usedInProjects)} پروژه` : 'هنوز استفاده نشده'}
          </span>
        </span>
      </span>
    </button>
  );
}

/**
 * W31 — کتابخانهٔ قالب‌های WBS و CBS (F16 ۷): فهرست با فیلتر نوع و جستجو، پیش‌نمایش
 * ساختار و اقلام و تنظیمات همراه و تاریخچهٔ نسخه‌ها، «بررسی وزن‌ها» (۵.۲)، انتشار
 * نسخه (۵.۴) و «ساخت پروژه از این قالب» (۵.۳).
 *
 * ویرایشگر قالب (حالت قالب W12) در بوم طراحی نشده است (شکاف G20)، پس «قالب جدید» و
 * «ویرایش قالب» غیرفعال‌اند و ساخت قالب در نسخهٔ اول از فایل انجام می‌شود (تصمیم
 * 1405/08/19).
 */
export default function TemplatesPage() {
  const canView = useHasPermission('templates.view');
  const canManage = useHasPermission('templates.manage');
  const canPublish = useHasPermission('templates.publish');

  const [projectTypeId, setProjectTypeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const list = useGetTemplatesQuery({ projectTypeId, includeArchived, search });
  const items = useMemo(() => list.data?.items ?? [], [list.data]);

  const activeId = useMemo(() => {
    if (selectedId && items.some((item) => item.id === selectedId)) return selectedId;
    return items[0]?.id ?? null;
  }, [selectedId, items]);

  const detail = useGetTemplateQuery(activeId ?? '', { skip: !activeId });
  const [publish, publishState] = usePublishTemplateMutation();
  const [archive] = useArchiveTemplateMutation();
  const [remove] = useDeleteTemplateMutation();
  const [setDefault] = useSetDefaultTemplateMutation();

  useEffect(() => {
    setPublishError(null);
  }, [dialog]);

  const typeItems = [
    { key: 'all', label: <span className="row g4">همه <span className="tx5">{toFaDigits(items.length)}</span></span> },
    ...(list.data?.typeCounts ?? []).map((entry) => ({
      key: entry.projectTypeId,
      label: (
        <span className="row g4">
          {entry.name} <span className="tx5">{toFaDigits(entry.count)}</span>
        </span>
      ),
    })),
  ];

  async function onArchive(archived: boolean) {
    if (!detail.data) return;
    try {
      await archive({ templateId: detail.data.id, archived }).unwrap();
      toast.success(
        archived
          ? 'قالب بایگانی شد؛ در ساخت پروژه دیده نمی‌شود و پروژه‌های ساخته‌شده دست‌نخورده‌اند.'
          : 'قالب از بایگانی بیرون آمد.',
      );
      setDialog(null);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  async function onDelete() {
    if (!detail.data) return;
    try {
      await remove(detail.data.id).unwrap();
      setSelectedId(null);
      setDialog(null);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  async function onPublish(note: string) {
    if (!detail.data) return;
    try {
      await publish({ templateId: detail.data.id, note }).unwrap();
      setDialog(null);
    } catch (cause) {
      setPublishError(getApiErrorMessage(cause));
    }
  }

  if (!canView) {
    return (
      <>
        <Topbar title="قالب‌ها" icon="layout-template" />
        <Content>
          <Alert tone="inf">دسترسی مشاهدهٔ قالب‌ها را ندارید. از مدیر سازمان بخواهید دسترسی «مشاهدهٔ قالب‌ها» را بدهد.</Alert>
        </Content>
      </>
    );
  }

  return (
    <>
      <Topbar title="قالب‌ها" icon="layout-template" />
      <Content>
        <PageHead
          title="قالب‌های WBS و CBS"
          subtitle="ساختارهای استاندارد سازمان برای شروع سریع پروژه؛ همراه با وزن‌ها، اقلام هزینه و تنظیمات گردش‌کار"
          style={{ marginBottom: 16 }}
          actions={
            <>
              <AppButton
                icon="file-up"
                disabled={!canManage}
                title={canManage ? undefined : 'دسترسی مدیریت قالب را ندارید.'}
                onClick={() => setDialog({ kind: 'import' })}
              >
                ساخت قالب از فایل
              </AppButton>
              <AppButton
                variant="primary"
                icon="plus"
                disabled
                title="ویرایشگر قالب با طراحی حالت قالب ویرایشگر WBS می‌آید (شکاف G20). تا آن زمان قالب را از فایل بسازید."
              >
                قالب جدید
              </AppButton>
            </>
          }
        />

        <div className="row between wrap g8" style={{ marginBottom: 14 }}>
          <SegmentedControl
            items={typeItems}
            activeKey={projectTypeId ?? 'all'}
            onChange={(key) => setProjectTypeId(key === 'all' ? null : key)}
          />
          <div className="row g8 wrap">
            <label className="row g6 t-12 tx6">
              <Switch checked={includeArchived} onChange={setIncludeArchived} label="شامل بایگانی‌شده" />
              {`شامل بایگانی‌شده${list.data?.archivedCount ? ` (${toFaDigits(list.data.archivedCount)})` : ''}`}
            </label>
            <TextInput
              size="sm"
              icon="search"
              style={{ width: 240 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجوی قالب"
              aria-label="جستجوی قالب"
            />
          </div>
        </div>

        {list.isError && (
          <Alert tone="err" action={<AppButton size="sm" onClick={() => list.refetch()}>تلاش دوباره</AppButton>}>
            {getApiErrorMessage(list.error)}
          </Alert>
        )}

        {list.isLoading ? (
          <Card>
            <SkeletonTable rows={6} />
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState
              icon="layout-template"
              title={search ? 'قالبی با این نام نیست' : 'هنوز قالبی ساخته نشده'}
              description={
                search
                  ? 'نام دیگری را جستجو کنید یا فیلتر نوع را روی «همه» بگذارید.'
                  : 'اولین قالب سازمان را از یک فایل Excel بسازید؛ بعد از انتشار، در ساخت پروژه پیشنهاد می‌شود.'
              }
              actions={
                search ? (
                  <AppButton size="sm" onClick={() => setSearch('')}>
                    پاک کردن جستجو
                  </AppButton>
                ) : (
                  <AppButton size="sm" variant="primary" icon="file-up" disabled={!canManage} onClick={() => setDialog({ kind: 'import' })}>
                    ساخت قالب از فایل
                  </AppButton>
                )
              }
            />
          </Card>
        ) : (
          <div className="row ai-s g14 wrap">
            <div className="col g8" style={{ flex: '1 1 300px', maxWidth: 372, minWidth: 0 }}>
              {items.map((item) => (
                <TemplateCardRow
                  key={item.id}
                  template={item}
                  selected={item.id === activeId}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </div>
            <div style={{ flex: '3 1 480px', minWidth: 0 }}>
              {detail.isLoading || !detail.data ? (
                <Card>
                  <SkeletonTable rows={8} />
                </Card>
              ) : (
                <TemplatePanel
                  key={detail.data.id}
                  template={detail.data}
                  canManage={canManage}
                  canPublish={canPublish}
                  onValidate={() => setDialog({ kind: 'validate' })}
                  onPublish={() => setDialog({ kind: 'publish' })}
                  onArchive={(archived) => setDialog({ kind: 'archive', archived })}
                  onDelete={() => setDialog({ kind: 'delete' })}
                  onSetDefault={async (isDefault) => {
                    try {
                      await setDefault({ templateId: detail.data!.id, isDefault }).unwrap();
                    } catch (cause) {
                      toast.error(getApiErrorMessage(cause));
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </Content>

      {dialog?.kind === 'import' && (
        <ImportTemplateDialog
          projectTypes={list.data?.projectTypes ?? []}
          onClose={() => setDialog(null)}
          onImported={(templateId) => {
            setDialog(null);
            setSelectedId(templateId);
            toast.success('قالب پیش‌نویس ساخته شد. پس از «بررسی وزن‌ها» آن را منتشر کنید تا در ساخت پروژه دیده شود.');
          }}
        />
      )}

      {dialog?.kind === 'validate' && detail.data && (
        <ValidationDialog
          template={detail.data}
          canPublish={canPublish}
          onPublish={() => setDialog({ kind: 'publish' })}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'publish' && detail.data && (
        <PublishDialog
          template={detail.data}
          busy={publishState.isLoading}
          error={publishError}
          onConfirm={(note) => void onPublish(note)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'archive' && detail.data && (
        <ConfirmDialog
          isOpen
          tone={dialog.archived ? 'warning' : 'info'}
          icon={dialog.archived ? 'archive' : 'archive-restore'}
          title={dialog.archived ? 'بایگانی قالب' : 'بیرون آوردن از بایگانی'}
          description={
            dialog.archived
              ? `«${detail.data.name}» در ساخت پروژه و پیشنهادها دیده نمی‌شود. پروژه‌هایی که از آن ساخته شده‌اند دست‌نخورده می‌مانند و هر وقت بخواهید از بایگانی بیرون می‌آید.`
              : `«${detail.data.name}» دوباره در ساخت پروژه دیده می‌شود.`
          }
          confirmLabel={dialog.archived ? 'بایگانی کن' : 'بیرون بیاور'}
          onCancel={() => setDialog(null)}
          onConfirm={() => void onArchive(dialog.archived)}
        />
      )}

      {dialog?.kind === 'delete' && detail.data && (
        <ConfirmDialog
          isOpen
          tone="danger"
          icon="trash-2"
          title="حذف قالب"
          description={`«${detail.data.name}» برای همیشه حذف می‌شود. این کار برگشت‌پذیر نیست؛ اگر فقط می‌خواهید در ساخت پروژه دیده نشود، بایگانی‌اش کنید.`}
          confirmLabel="حذف قالب"
          confirmText={detail.data.name}
          confirmTextLabel="برای تأیید، نام قالب را بنویسید"
          onCancel={() => setDialog(null)}
          onConfirm={() => void onDelete()}
        />
      )}
    </>
  );
}
