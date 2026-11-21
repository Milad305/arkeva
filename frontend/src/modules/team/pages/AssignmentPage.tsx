import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Card } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { faNum, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { useAssignMutation, useGetAssignmentsQuery, usePreviewAssignQuery } from '../api/teamApi';
import { AssignTree } from '../components/AssignTree';
import { TeamTabs } from '../components/TeamTabs';

/**
 * W17 — تخصیص فعالیت به سرپرستان (team-assignment.md ۵): فهرست سرپرستان با بار کاری،
 * درخت WBS با انتخاب گروهی (والد = همهٔ برگ‌های فعال غیرزمانی)، و پنل تخصیص با بار کاری
 * پس از تخصیص و میانگین از سرور و پیام صریح انتقال. تخصیص عملیاتی و بدون نسخه است (D05).
 */
export default function AssignmentPage() {
  const { project } = useProjectContext();
  const canAssign =
    useHasPermission('assignment.manage') &&
    project.status !== 'completed' &&
    project.status !== 'archived';
  const [searchParams] = useSearchParams();
  const query = useGetAssignmentsQuery(project.id);
  const [assign, assignState] = useAssignMutation();

  const [targetId, setTargetId] = useState<EntityId | null>(searchParams.get('supervisor'));
  const [selected, setSelected] = useState<Set<EntityId>>(
    () => new Set(searchParams.get('wbsItem') ? [searchParams.get('wbsItem')!] : []),
  );
  const [search, setSearch] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(searchParams.get('filter') === 'unassigned');

  const data = query.data;
  useEffect(() => {
    if (!targetId && data?.supervisors[0]) setTargetId(data.supervisors[0].userId);
  }, [data, targetId]);

  const ids = useMemo(() => [...selected], [selected]);
  const preview = usePreviewAssignQuery(
    { projectId: project.id, wbsItemIds: ids, supervisorUserId: targetId },
    { skip: ids.length === 0 || !targetId },
  );
  const byId = useMemo(() => new Map((data?.items ?? []).map((item) => [item.id, item])), [data]);
  const target = data?.supervisors.find((supervisor) => supervisor.userId === targetId) ?? null;

  async function submit(supervisorUserId: EntityId | null) {
    try {
      await assign({ projectId: project.id, wbsItemIds: ids, supervisorUserId }).unwrap();
      setSelected(new Set());
    } catch {
      // پیام را میان‌افزار نشان می‌دهد
    }
  }

  if (!canAssign) {
    return (
      <Content>
        <TeamTabs projectId={project.id} active="assignment" showAssignment />
        <EmptyState
          inCard
          icon="lock"
          title="تخصیص فعالیت‌ها برای شما باز نیست"
          description="برای سپردن فعالیت به سرپرستان دسترسی «مدیریت تخصیص» لازم است، یا پروژه بسته شده است."
          actions={
            <LinkButton to={ROUTES.members(project.id)} variant="primary" size="sm" icon="users">
              اعضای پروژه
            </LinkButton>
          }
        />
      </Content>
    );
  }

  const transfers = preview.data?.transfers ?? [];
  const loadMax = Math.max(
    1,
    (preview.data?.averageAfter ?? data?.averageWorkload ?? 1) * 2.5,
    preview.data?.workloadAfter ?? 0,
  );

  return (
    <Content>
      <TeamTabs projectId={project.id} active="assignment" showAssignment />
      <span className="t-12 tx5" style={{ display: 'block', marginTop: -8, marginBottom: 12 }}>
        یک سرپرست را انتخاب کنید، سپس فعالیت‌های برگ را با چک‌باکس به او بسپارید. انتخاب والد همهٔ
        برگ‌های زیرش را انتخاب می‌کند.
      </span>

      {query.isLoading ? (
        <SkeletonTable rows={10} />
      ) : query.isError || !data ? (
        <EmptyState
          inCard
          icon="server"
          title="تخصیص‌ها بارگذاری نشد"
          description="چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton
              size="sm"
              variant="primary"
              icon="refresh-cw"
              onClick={() => void query.refetch()}
            >
              تلاش دوباره
            </AppButton>
          }
        />
      ) : data.supervisors.length === 0 ? (
        <EmptyState
          inCard
          icon="hard-hat"
          title="هنوز سرپرست کارگاهی عضو پروژه نیست"
          description="اول از «اعضا» کسی را با نقش سرپرست کارگاه اضافه کنید."
          actions={
            <LinkButton
              to={ROUTES.members(project.id)}
              variant="primary"
              size="sm"
              icon="user-plus"
            >
              افزودن عضو
            </LinkButton>
          }
        />
      ) : (
        <div className="assign-grid">
          {/* ── سرپرستان ── */}
          <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="pane-h">
              <h3 className="h-sh row g6">
                <span className="tx5" style={{ display: 'inline-flex' }}>
                  <Icon name="hard-hat" size={15} />
                </span>
                سرپرستان کارگاه
              </h3>
              <p className="t-sm tx5" style={{ margin: '4px 0 0' }}>
                {toFaDigits(data.supervisors.length)} نفر ·{' '}
                {toFaDigits(
                  data.supervisors.filter((supervisor) => !data.items.some((item) => item.supervisorUserId === supervisor.userId)).length,
                )}{' '}
                نفر بدون تخصیص · میانگین {faNum(data.averageWorkload, 1)}
              </p>
            </div>
            <div
              className="col g2"
              style={{ padding: 8, overflowY: 'auto', minHeight: 0 }}
              role="radiogroup"
              aria-label="سرپرست هدف"
            >
              {data.supervisors.map((supervisor) => (
                <button
                  key={supervisor.userId}
                  type="button"
                  role="radio"
                  aria-checked={supervisor.userId === targetId}
                  className={supervisor.userId === targetId ? 'row g10 sel-card' : 'row g10'}
                  style={{
                    padding: '9px 10px',
                    borderRadius: 8,
                    textAlign: 'start',
                    width: '100%',
                  }}
                  onClick={() => setTargetId(supervisor.userId)}
                >
                  <Avatar name={supervisor.fullName} tone={supervisor.avatarTone} size="l" />
                  <span className="col grow" style={{ minWidth: 0 }}>
                    <span className="t-13 fw6 tx9">{supervisor.fullName}</span>
                    <span className="t-xs tx5 trunc">{supervisor.note}</span>
                  </span>
                  <span className="col" style={{ alignItems: 'center' }}>
                    <span className="num-i tx-pri">{toFaDigits(supervisor.workload)}</span>
                    <span className="t-xs tx5">فعالیت</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* ── درخت ── */}
          <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="pane-h col g8">
              <div className="row between">
                <h3 className="h-sh row g6">
                  <span className="tx5" style={{ display: 'inline-flex' }}>
                    <Icon name="git-branch" size={15} />
                  </span>
                  فعالیت‌های WBS
                </h3>
                <span className="t-sm tx5">انتخاب والد = همهٔ فرزندان</span>
              </div>
              <TextInput
                size="sm"
                icon="search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جستجوی فعالیت…"
                aria-label="جستجوی فعالیت"
              />
              <Switch
                checked={onlyUnassigned}
                onChange={setOnlyUnassigned}
                label={`فقط بی‌سرپرست (${toFaDigits(data.unassignedCount)})`}
              />
            </div>
            <div style={{ overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
              <AssignTree
                items={data.items}
                selected={selected}
                onChange={setSelected}
                targetUserId={targetId}
                search={search}
                onlyUnassigned={onlyUnassigned}
              />
            </div>
          </Card>

          {/* ── پنل تخصیص ── */}
          <Card style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="pane-h">
              <h3 className="h-sh row g6">
                <span className="tx5" style={{ display: 'inline-flex' }}>
                  <Icon name="check-square" size={15} />
                </span>
                انتخاب‌شده برای تخصیص
              </h3>
            </div>
            <div
              className="col g10"
              style={{ padding: 12, flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}
            >
              {target && (
                <div className="row g10 pri" style={{ padding: 12, borderRadius: 8 }}>
                  <Avatar name={target.fullName} tone={target.avatarTone} size="l" />
                  <span className="col">
                    <span className="t-sm">تخصیص به</span>
                    <span className="t-14 fw7" style={{ color: '#0E1E38' }}>
                      {target.fullName}
                    </span>
                  </span>
                </div>
              )}
              {ids.length === 0 ? (
                <span className="t-12 tx6">فعالیت‌های برگ را در درخت انتخاب کنید.</span>
              ) : (
                <>
                  {preview.data && (
                    <div className="col g4">
                      <div className="row between t-sm tx6">
                        <span>بار کاری پس از تخصیص</span>
                        <strong className="tx9">
                          {toFaDigits(preview.data.workloadAfter)} فعالیت
                        </strong>
                      </div>
                      <ProgressBar
                        value={(preview.data.workloadAfter / loadMax) * 100}
                        color={preview.data.imbalanced ? '#D97706' : undefined}
                        label="بار کاری پس از تخصیص"
                        style={{ flex: '0 0 auto' }}
                      />
                      <span className="t-xs tx5">
                        میانگین سرپرستان: {faNum(preview.data.averageAfter, 1)} فعالیت
                      </span>
                    </div>
                  )}
                  <div className="col g6">
                    {ids.map((id) => {
                      const item = byId.get(id);
                      if (!item) return null;
                      const transfer = transfers.find((entry) => entry.wbsItemId === id);
                      return (
                        <div
                          key={id}
                          className={transfer ? 'row g8 wrn' : 'row g8 box'}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: transfer ? '1px solid #F4B17C' : undefined,
                          }}
                        >
                          <span className="ic-l" style={{ display: 'inline-flex' }}>
                            <Icon name="file-text" size={14} />
                          </span>
                          <span className="col grow" style={{ minWidth: 0 }}>
                            <span className="t-12 tx8 trunc">{item.title}</span>
                            {transfer ? (
                              <span className="t-xs">از {transfer.fromName} منتقل می‌شود</span>
                            ) : (
                              <span
                                className="mono t-xs tx5"
                                dir="ltr"
                                style={{ textAlign: 'right' }}
                              >
                                {item.code}
                              </span>
                            )}
                          </span>
                          <IconButton
                            icon="x"
                            label={`حذف ${item.title} از انتخاب`}
                            size="sm"
                            onClick={() => {
                              const next = new Set(selected);
                              next.delete(id);
                              setSelected(next);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {transfers.length > 0 && target && (
                    <Alert tone="wrn" icon="alert-triangle">
                      {transfers.length === 1
                        ? `«${transfers[0]!.title}» الان به ${transfers[0]!.fromName} سپرده شده است. با انتساب، گزارش‌های بعدی آن از ${target.fullName} دریافت می‌شود و به ${transfers[0]!.fromName} پیامک اطلاع داده می‌شود.`
                        : `${toFaDigits(transfers.length)} فعالیت از ${[...new Set(transfers.map((entry) => entry.fromName))].join('، ')} منتقل می‌شود. گزارش‌های بعدی از ${target.fullName} دریافت می‌شود و به سرپرستان قبلی پیامک اطلاع داده می‌شود. آیتم‌های در گردش دست نمی‌خورند.`}
                    </Alert>
                  )}
                  {preview.data?.imbalanced && target && (
                    <Alert tone="inf" icon="scale">
                      بار {target.fullName} بیش از دو برابر میانگین می‌شود (AL-RES-01). بازتوزیع را
                      بررسی کنید.
                    </Alert>
                  )}
                </>
              )}
            </div>
            <div className="row g8" style={{ padding: 12, borderTop: '1px solid #F4F4F5' }}>
              <AppButton
                variant="ghost"
                className="grow"
                disabled={ids.length === 0}
                onClick={() => setSelected(new Set())}
              >
                انصراف
              </AppButton>
              <AppButton
                variant="outline"
                icon="user-x"
                disabled={ids.length === 0 || !ids.some((id) => byId.get(id)?.supervisorUserId)}
                loading={
                  assignState.isLoading && assignState.originalArgs?.supervisorUserId === null
                }
                onClick={() => void submit(null)}
                title="سرپرست فعالیت‌های انتخاب‌شده برداشته می‌شود"
              >
                بی‌سرپرست
              </AppButton>
              <AppButton
                variant="primary"
                icon="check"
                style={{ flex: '2 1 0' }}
                disabled={ids.length === 0 || !targetId || (preview.data?.assignCount ?? 1) === 0}
                loading={
                  assignState.isLoading && assignState.originalArgs?.supervisorUserId !== null
                }
                onClick={() => void submit(targetId)}
              >
                انتساب {toFaDigits(preview.data?.assignCount ?? ids.length)} فعالیت
              </AppButton>
            </div>
          </Card>
        </div>
      )}
    </Content>
  );
}
