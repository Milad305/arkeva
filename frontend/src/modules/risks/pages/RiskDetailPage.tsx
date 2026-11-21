import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { RISK_LEVEL, RISK_STATUS, RISK_STATUS_TONES, type RiskLevel } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { KeyValue } from '@/shared/components/ui/KeyValue';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { Select } from '@/shared/components/ui/Select';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { Timeline } from '@/shared/components/ui/Timeline';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatJalaliDate, formatJalaliDateTime, formatRelativeTime, jalaliToIso } from '@/shared/utils/date';
import { formatRial, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { Tone } from '@/shared/types/tone';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import {
  useAddRiskNoteMutation,
  useAllocateContingencyMutation,
  useFollowRiskMutation,
  useGetRiskPeopleQuery,
  useGetRiskQuery,
  useGetRiskRegisterQuery,
  useSaveRiskActionMutation,
} from '../api/risksApi';
import { RiskFormDialog } from '../components/RiskFormDialog';
import { MergeRiskDialog, RiskStatusDialog, type RiskStatusMode } from '../components/RiskStatusDialog';
import { categoryColor, CLOSE_REASON_LABEL, FREQUENCY_LABEL, STRATEGY_LABEL } from '../services/riskView';
import type { RiskActionDto, RiskActionStatus, RiskDetailDto, RiskHistoryEntryDto } from '../types';

const levelTone = (level: RiskLevel): Tone => (level === 'low' ? 'pri' : level === 'medium' ? 'wrn' : 'err');
const ACTION_STATUS: Record<RiskActionStatus, string> = { open: 'باز', in_progress: 'در حال انجام', done: 'انجام‌شده', cancelled: 'لغوشده' };
const HISTORY_ICON: Record<RiskHistoryEntryDto['kind'], [IconName, Tone]> = {
  note: ['message-square', 'neu'],
  score: ['activity', 'wrn'],
  status: ['flag', 'inf'],
  created: ['plus', 'pri'],
  action: ['list-checks', 'ok'],
  contingency: ['receipt', 'acc'],
};

/**
 * W19 — جزئیات ریسک (risk.md ۷.۲): ارزیابی فعلی و هدف با روند امتیاز، علت/رویداد/پیامد،
 * اقدام‌ها (وضعیت خودکار ریسک از سرور، AC-RK-06)، یادداشت و تاریخچه با @نام، ویژگی‌ها،
 * اثر بالقوه و تخصیص ذخیره (AC-RK-08)، پیوندها و دنبال‌کنندگان.
 */
export default function RiskDetailPage() {
  const { riskId = '' } = useParams();
  const { project } = useProjectContext();
  const canViewAmounts = useHasPermission('cbs.view_amounts');
  const query = useGetRiskQuery({ riskId, canViewAmounts });
  const risk = query.data;

  return (
    <Content>
      <Link to={ROUTES.projectRisks(project.id)} className="link row g4 t-13" style={{ marginBottom: 10, display: 'inline-flex' }}>
        <Icon name="arrow-right" size={14} />
        دفتر ریسک
      </Link>
      {query.isLoading ? (
        <SkeletonTable rows={8} />
      ) : query.isError || !risk || risk.projectId !== project.id ? (
        <EmptyState
          inCard
          icon="shield"
          title="این ریسک پیدا نشد"
          description="ممکن است ادغام یا از دسترس شما خارج شده باشد."
          actions={
            <AppButton size="sm" variant="primary" icon="arrow-right" onClick={() => void query.refetch()}>
              تلاش دوباره
            </AppButton>
          }
        />
      ) : (
        <RiskDetail risk={risk} projectName={project.name} canViewAmounts={canViewAmounts} archived={project.status === 'archived'} />
      )}
    </Content>
  );
}

function RiskDetail({ risk, projectName, canViewAmounts, archived }: { risk: RiskDetailDto; projectName: string; canViewAmounts: boolean; archived: boolean }) {
  const navigate = useNavigate();
  const canEdit = useHasPermission('risk.edit') && !archived;
  const canStatus = useHasPermission('risk.change_status_owner') && !archived;
  const canAllocate = useHasPermission('risk.allocate_contingency') && canViewAmounts && !archived;
  const register = useGetRiskRegisterQuery({ projectId: risk.projectId, canViewAmounts });
  const [follow, followState] = useFollowRiskMutation();
  const [editing, setEditing] = useState(false);
  const [statusMode, setStatusMode] = useState<RiskStatusMode | null>(null);
  const [merging, setMerging] = useState(false);
  const isClosed = risk.status === 'closed';
  const isOpen = risk.status !== 'closed' && risk.status !== 'occurred';

  const menu: MenuEntry[] = [
    ...(canStatus && isOpen
      ? [
          { key: 'occurred', label: 'ثبت وقوع (رخ داد)', icon: 'alert-octagon' as const, onSelect: () => setStatusMode('occurred') },
          { key: 'close', label: 'بستن ریسک', icon: 'check-circle-2' as const, onSelect: () => setStatusMode('closed') },
        ]
      : []),
    ...(canStatus && !isOpen ? [{ key: 'reopen', label: 'بازگشایی', icon: 'rotate-ccw' as const, onSelect: () => setStatusMode('assessed') }] : []),
    ...(!isClosed ? [{ key: 'merge', label: canStatus ? 'ادغام در ریسک دیگر' : 'پیشنهاد ادغام', icon: 'git-merge' as const, onSelect: () => setMerging(true) }] : []),
  ];

  return (
    <>
      <div className="page-head">
        <div className="col g6" style={{ minWidth: 0 }}>
          <span className="row wrap g8">
            <span className="mono t-13 tx6">{risk.code}</span>
            <Badge tone={RISK_STATUS_TONES[risk.status]}>{RISK_STATUS[risk.status]}</Badge>
            {risk.level && <Badge tone={levelTone(risk.level)}>{`${RISK_LEVEL[risk.level]} · ${toFaDigits(risk.score ?? 0)}`}</Badge>}
            <span className="row g4 t-12 tx6">
              <span className="dot" style={{ color: categoryColor(risk.category) }} />
              {risk.category}
            </span>
          </span>
          <h1 className="h-display">{risk.title}</h1>
          <span className="t-13 tx6">
            {projectName} · ثبت {risk.createdBy} {formatRelativeTime(risk.createdAt)}
            {risk.sourceReportedBy ? ` · از گزارش کارگاه ${risk.sourceReportedBy}` : ''}
          </span>
        </div>
        <div className="row wrap g8">
          <AppButton variant="outline" icon={risk.isFollowing ? 'bell-off' : 'bell'} loading={followState.isLoading} onClick={() => void follow({ riskId: risk.id, follow: !risk.isFollowing })}>
            {risk.isFollowing ? 'لغو دنبال کردن' : 'دنبال کردن'}
          </AppButton>
          {canEdit && !isClosed && (
            <AppButton variant="outline" icon="pencil" onClick={() => setEditing(true)}>
              ویرایش
            </AppButton>
          )}
          {menu.length > 0 && (
            <Menu
              entries={menu}
              trigger={(props) => (
                <AppButton {...props} variant="primary" icon="chevron-down">
                  تغییر وضعیت
                </AppButton>
              )}
            />
          )}
        </div>
      </div>

      {isClosed && risk.closeReason && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="ok" icon="check-circle-2" action={canStatus && <AppButton size="xs" variant="outline" onClick={() => setStatusMode('assessed')}>بازگشایی</AppButton>}>
            {`این ریسک با دلیل «${CLOSE_REASON_LABEL[risk.closeReason]}» بسته شده است. اقدام‌های باز آن لغو شده‌اند.`}
          </Alert>
        </div>
      )}
      {risk.status === 'occurred' && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="err" icon="alert-octagon">
            {`رخ داد ${formatJalaliDate(risk.occurredAt)}`}
            {risk.actualDelayDays ? ` · ${toFaDigits(risk.actualDelayDays)} روز تأخیر واقعی` : ''}
            {risk.actualCost ? ` · هزینهٔ واقعی ${formatRial(risk.actualCost)}` : ''}
          </Alert>
        </div>
      )}

      <div className="risk-detail-grid">
        <div className="col g16" style={{ minWidth: 0 }}>
          <AssessmentCard risk={risk} />
          <Card>
            <CardHeader icon="file-text" title="شرح ریسک" />
            <CardBody>
              <div className="grid c3 rsp" style={{ gap: 14 }}>
                <DescBlock label="علت" text={risk.cause} />
                <DescBlock label="رویداد" text={risk.event} />
                <DescBlock label="پیامد" text={risk.consequence} />
              </div>
              {risk.triggerText && (
                <div className="row g6 t-13 tx7" style={{ marginTop: 14 }}>
                  <Icon name="bell" size={14} className="tx-wrn" />
                  <span>
                    <span className="fw6">نشانهٔ هشدار: </span>
                    {risk.triggerText}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
          <ActionsCard risk={risk} canEdit={canEdit && !isClosed} />
          <NotesCard risk={risk} />
        </div>

        <div className="col g16" style={{ minWidth: 0 }}>
          <Card>
            <CardHeader icon="info" title="ویژگی‌ها" />
            <CardBody className="col g10">
              <KeyValue
                label="مالک ریسک"
                value={
                  <span className="row g6">
                    <Avatar name={risk.owner.fullName} tone={risk.owner.avatarTone ?? 'a1'} size="s" />
                    {risk.owner.fullName}
                  </span>
                }
              />
              <KeyValue label="راهبرد پاسخ" value={risk.responseStrategy ? STRATEGY_LABEL[risk.responseStrategy] : '—'} />
              <KeyValue label="منبع" value={risk.source === 'field' ? 'گزارش کارگاه' : 'ثبت دستی'} />
              <KeyValue label="بازبینی بعدی" value={risk.nextReviewDate ? `${formatJalaliDate(risk.nextReviewDate)}${risk.reviewFrequency ? ` · ${FREQUENCY_LABEL[risk.reviewFrequency]}` : ''}` : '—'} />
              <KeyValue label="ثبت" value={formatJalaliDateTime(risk.createdAt)} />
            </CardBody>
          </Card>
          <ImpactCard risk={risk} canViewAmounts={canViewAmounts} canAllocate={canAllocate && !isClosed} />
          <Card>
            <CardHeader icon="link" title="پیوندها" />
            <CardBody className="col g10">
              {risk.links.length === 0 ? (
                <span className="t-13 tx5">به فعالیت یا قلم هزینه‌ای پیوند ندارد.</span>
              ) : (
                risk.links.map((link) => (
                  <div key={`${link.kind}-${link.targetId}`} className="row g8 ai-st">
                    <Icon name={link.kind === 'wbs_item' ? 'list-tree' : link.kind === 'cbs_item' ? 'receipt' : 'clipboard-list'} size={15} className="tx5" />
                    <span className="col grow" style={{ minWidth: 0 }}>
                      <span className={`t-13 ${link.removed ? 'tx5' : 'tx9'}`} style={link.removed ? { textDecoration: 'line-through' } : undefined}>
                        {link.code && <span className="mono t-12 tx6">{link.code} · </span>}
                        {link.title}
                      </span>
                      {link.removed ? (
                        <span className="t-xs tx5">در برنامهٔ جاری حذف شده</span>
                      ) : (
                        link.metric && <span className={`t-xs ${link.metricTone === 'err' ? 'tx-err' : link.metricTone === 'wrn' ? 'tx-wrn' : 'tx5'}`}>{link.metric}</span>
                      )}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader icon="users" title={`دنبال‌کنندگان (${toFaDigits(risk.followers.length)})`} />
            <CardBody className="row wrap g8">
              {risk.followers.map((person) => (
                <span key={person.id} className="row g6 t-12 tx7">
                  <Avatar name={person.fullName} tone={person.avatarTone ?? 'a1'} size="s" />
                  {person.fullName}
                </span>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {editing && (
        <RiskFormDialog
          projectId={risk.projectId}
          projectName={projectName}
          categories={register.data?.categories ?? [risk.category]}
          risk={risk}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      {statusMode && <RiskStatusDialog risk={risk} mode={statusMode} canViewAmounts={canViewAmounts} onClose={() => setStatusMode(null)} />}
      {merging && (
        <MergeRiskDialog
          risk={risk}
          canMerge={canStatus}
          onClose={() => setMerging(false)}
          onMerged={(targetId) => {
            setMerging(false);
            if (targetId) navigate(ROUTES.riskDetail(risk.projectId, targetId));
          }}
        />
      )}
    </>
  );
}

function DescBlock({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="col g4">
      <span className="t-xs tx5 fw6">{label}</span>
      <span className={`t-13 lh ${text ? 'tx8' : 'tx5'}`}>{text || 'نوشته نشده'}</span>
    </div>
  );
}

/** ارزیابی فعلی، هدف و روند امتیاز. نمودار زمانی چپ‌به‌راست (CLAUDE.md ۵). */
function AssessmentCard({ risk }: { risk: RiskDetailDto }) {
  const history = risk.scoreHistory;
  const width = 280;
  const height = 72;
  const points = history.map((entry, index) => {
    const x = history.length === 1 ? width / 2 : 8 + (index * (width - 16)) / (history.length - 1);
    const y = height - 6 - (entry.score / 25) * (height - 12);
    return { x, y, entry };
  });
  return (
    <Card>
      <CardHeader icon="activity" title="ارزیابی" />
      <CardBody className="row wrap g20 ai-st">
        <ScoreBox label="فعلی" probability={risk.probability} impact={risk.impact} score={risk.score} level={risk.level} />
        <span className="tx5" style={{ alignSelf: 'center' }}><Icon name="arrow-left" size={18} /></span>
        <ScoreBox label="هدف پس از اقدام‌ها" probability={risk.targetProbability} impact={risk.targetImpact} score={risk.targetScore} level={risk.targetLevel} />
        <div className="col g4 grow" style={{ minWidth: 220 }}>
          <span className="t-xs tx5">روند امتیاز</span>
          {points.length > 0 ? (
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} direction="ltr" role="img" aria-label={`روند امتیاز: ${points.map((point) => toFaDigits(point.entry.score)).join('، ')}`}>
              <line x1={0} x2={width} y1={height - 6 - (15 / 25) * (height - 12)} y2={height - 6 - (15 / 25) * (height - 12)} stroke="#FCA5A5" strokeDasharray="3 3" />
              <polyline fill="none" stroke="#1A3354" strokeWidth={2} points={points.map((point) => `${point.x},${point.y}`).join(' ')} />
              {points.map((point) => (
                <g key={point.entry.at}>
                  <circle cx={point.x} cy={point.y} r={3.5} fill="#FFFFFF" stroke="#1A3354" strokeWidth={2}>
                    <title>{`${formatJalaliDate(point.entry.at)} · ${toFaDigits(point.entry.score)}`}</title>
                  </circle>
                </g>
              ))}
            </svg>
          ) : (
            <span className="t-13 tx5">هنوز ارزیابی نشده</span>
          )}
          <span className="t-xs tx6">خط‌چین قرمز: آستانهٔ ۱۵ (اعلان فوری)</span>
        </div>
      </CardBody>
    </Card>
  );
}

function ScoreBox({ label, probability, impact, score, level }: { label: string; probability: number | null; impact: number | null; score: number | null; level: RiskLevel | null }) {
  return (
    <div className="col g4" style={{ minWidth: 120 }}>
      <span className="t-xs tx5">{label}</span>
      {score !== null && level ? (
        <>
          <span className="row g6">
            <span className={`fw7 ${level === 'low' ? 'tx-pri' : level === 'medium' ? 'tx-wrn' : 'tx-err'}`} style={{ fontSize: 26 }}>
              {toFaDigits(score)}
            </span>
            <Badge tone={levelTone(level)}>{RISK_LEVEL[level]}</Badge>
          </span>
          <span className="t-12 tx6">{`احتمال ${toFaDigits(probability ?? 0)} × اثر ${toFaDigits(impact ?? 0)}`}</span>
        </>
      ) : (
        <span className="t-13 tx5" style={{ marginTop: 6 }}>تعیین نشده</span>
      )}
    </div>
  );
}

function ActionsCard({ risk, canEdit }: { risk: RiskDetailDto; canEdit: boolean }) {
  const people = useGetRiskPeopleQuery(risk.projectId, { skip: !canEdit });
  const [save, saveState] = useSaveRiskActionMutation();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState<string | null>(null);
  const [due, setDue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dueIso = due.trim() ? jalaliToIso(toEnDigits(due.trim())) : null;

  async function run(body: Parameters<typeof save>[0]) {
    setError(null);
    try {
      await save(body).unwrap();
      return true;
    } catch (cause) {
      setError(getApiErrorMessage(cause));
      return false;
    }
  }

  async function add() {
    if (!title.trim() || !dueIso) {
      setError(!title.trim() ? 'عنوان اقدام را بنویسید.' : 'سررسید را شمسی مثل ۱۴۰۵/۰۹/۱۵ بنویسید.');
      return;
    }
    if (await run({ riskId: risk.id, actionId: null, title, ownerUserId: owner ?? risk.owner.id, dueDate: dueIso })) {
      setTitle('');
      setDue('');
      setAdding(false);
    }
  }

  const columns: Array<Column<RiskActionDto>> = [
    {
      key: 'title',
      header: 'اقدام',
      minWidth: 220,
      render: (action) => (
        <span className="col g2">
          <span className={`t-13 ${action.status === 'cancelled' ? 'tx5' : 'tx9'}`} style={action.status === 'cancelled' ? { textDecoration: 'line-through' } : undefined}>
            {action.title}
          </span>
          {action.completionNote && <span className="t-xs tx5">{action.completionNote}</span>}
          {action.costNote && <span className="t-xs tx6">{action.costNote}</span>}
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'مسئول',
      minWidth: 120,
      render: (action) => <span className="t-12 tx7">{action.owner.fullName}</span>,
    },
    {
      key: 'due',
      header: 'موعد',
      minWidth: 96,
      render: (action) => (
        <span className={`t-12 row g4 ${action.overdue ? 'tx-err fw6' : 'tx7'}`}>
          {action.overdue && <Icon name="alert-circle" size={12} />}
          {action.dueDate ? formatJalaliDate(action.dueDate) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      minWidth: 140,
      render: (action) =>
        canEdit && action.status !== 'cancelled' ? (
          <Select
            size="sm"
            label={`وضعیت اقدام ${action.title}`}
            options={(['open', 'in_progress', 'done', 'cancelled'] as RiskActionStatus[]).map((value) => ({ value, label: ACTION_STATUS[value] }))}
            value={action.status}
            onChange={(status) => void run({ riskId: risk.id, actionId: action.id, status })}
            width={130}
          />
        ) : (
          <Badge tone={action.status === 'done' ? 'ok' : action.status === 'cancelled' ? 'neu' : 'inf'}>{ACTION_STATUS[action.status]}</Badge>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader
        icon="list-checks"
        title={`برنامهٔ اقدام (${toFaDigits(risk.actions.length)})`}
        subtitle="وضعیت ریسک با اقدام‌ها خودکار عوض می‌شود"
        action={
          canEdit &&
          !adding && (
            <AppButton size="sm" variant="outline" icon="plus" onClick={() => setAdding(true)}>
              افزودن اقدام
            </AppButton>
          )
        }
      />
      <DataTable rows={risk.actions} columns={columns} getRowId={(action) => action.id} minWidth={560} caption="اقدام‌های ریسک" empty={<span className="t-13 tx6">هنوز اقدامی تعریف نشده.</span>} />
      {adding && (
        <div className="risk-add-action">
          <div className="fg">
            <label className="lbl t-12" htmlFor="new-action">عنوان اقدام</label>
            <TextInput id="new-action" size="sm" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <Select size="sm" label="مسئول" options={(people.data?.members ?? []).map((person) => ({ value: person.id, label: person.fullName }))} value={owner ?? risk.owner.id} onChange={setOwner} />
          <div className="fg">
            <label className="lbl t-12" htmlFor="new-action-due">موعد</label>
            <TextInput id="new-action-due" size="sm" ltr placeholder="۱۴۰۵/۰۹/۱۵" value={due} onChange={(event) => setDue(event.target.value)} />
          </div>
          <span className="row g6">
            <AppButton size="sm" variant="ghost" onClick={() => setAdding(false)}>
              انصراف
            </AppButton>
            <AppButton size="sm" variant="primary" loading={saveState.isLoading} onClick={() => void add()}>
              افزودن
            </AppButton>
          </span>
        </div>
      )}
      {error && (
        <div style={{ padding: '0 16px 12px' }}>
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        </div>
      )}
    </Card>
  );
}

function NotesCard({ risk }: { risk: RiskDetailDto }) {
  const [addNote, state] = useAddRiskNoteMutation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const entries = risk.history; // سرور تازه‌ترین را اول می‌دهد

  async function submit() {
    if (!text.trim()) return;
    setError(null);
    try {
      await addNote({ riskId: risk.id, text }).unwrap();
      setText('');
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Card>
      <CardHeader icon="message-square" title="یادداشت‌ها و تاریخچه" />
      <CardBody className="col g12">
        <div className="fg">
          <label className="lbl t-12" htmlFor="risk-note">یادداشت تازه</label>
          <TextArea id="risk-note" rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="برای خبر کردن همکار @نام او را بنویسید" />
          <span className="row g8" style={{ justifyContent: 'space-between' }}>
            <span className="hint">یادداشت پس از ثبت ویرایش نمی‌شود.</span>
            <AppButton size="sm" variant="primary" icon="send" disabled={!text.trim()} loading={state.isLoading} onClick={() => void submit()}>
              ثبت یادداشت
            </AppButton>
          </span>
        </div>
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
        <Timeline
          entries={entries.map((entry, index) => {
            const [icon, tone] = HISTORY_ICON[entry.kind];
            return {
              id: `${entry.at}-${index}`,
              icon,
              tone,
              text: (
                <>
                  <strong>{entry.by}</strong> {entry.kind === 'note' ? <span className="tx8">{entry.text}</span> : <span className="tx7">{entry.text}</span>}
                </>
              ),
              time: formatRelativeTime(entry.at),
            };
          })}
        />
      </CardBody>
    </Card>
  );
}

/** اثر بالقوه و ذخیرهٔ احتیاطی (۵.۶، ۵.۷). مبلغ‌ها بی‌مجوز پنهان (AC-RK-10). */
function ImpactCard({ risk, canViewAmounts, canAllocate }: { risk: RiskDetailDto; canViewAmounts: boolean; canAllocate: boolean }) {
  const [allocate, state] = useAllocateContingencyMutation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const contingency = risk.contingency;

  async function submit() {
    setError(null);
    const billions = Number(toEnDigits(value).replace(/[٫/]/g, '.').replace(/[٬,]/g, ''));
    if (!Number.isFinite(billions) || billions < 0) {
      setError('مبلغ را به میلیارد ریال بنویسید.');
      return;
    }
    try {
      await allocate({ riskId: risk.id, amount: String(Math.round(billions * 1e9)) }).unwrap();
      setEditing(false);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Card>
      <CardHeader icon="scale" title="اثر بالقوه" />
      <CardBody className="col g10">
        {canViewAmounts && <KeyValue label="اثر هزینه‌ای" value={risk.costImpact ? formatRial(risk.costImpact) : '—'} />}
        <KeyValue label="اثر زمانی" value={risk.scheduleImpactDays ? `${toFaDigits(risk.scheduleImpactDays)} روز` : '—'} />
        {canViewAmounts && (
          <div className="col g8" style={{ borderTop: '1px solid #F4F4F5', paddingTop: 10 }}>
            <span className="row g6" style={{ justifyContent: 'space-between' }}>
              <span className="t-13 fw6 tx8">ذخیرهٔ احتیاطی</span>
              {canAllocate && !editing && (
                <button type="button" className="link t-12" onClick={() => { setValue(contingency.allocated ? String(Number(contingency.allocated) / 1e9) : ''); setEditing(true); }}>
                  {contingency.allocated && contingency.allocated !== '0' ? 'تغییر تخصیص' : 'تخصیص'}
                </button>
              )}
            </span>
            <KeyValue label="تخصیص‌یافته" value={contingency.allocated ? formatRial(contingency.allocated) : '—'} />
            <KeyValue label="مصرف‌شده" value={contingency.consumed ? formatRial(contingency.consumed) : '—'} />
            {contingency.coveragePercent !== null && (
              <span className="col g4">
                <ProgressBar value={Math.min(100, contingency.coveragePercent)} size="thin" label="پوشش اثر هزینه با ذخیره" />
                <span className="t-xs tx5">{`پوشش ${toFaDigits(Math.round(contingency.coveragePercent))}٪ از اثر هزینه‌ای`}</span>
              </span>
            )}
            <span className="t-xs tx5">{`مانده ذخیرهٔ پروژه: ${contingency.projectRemaining ? formatRial(contingency.projectRemaining) : '—'}`}</span>
            {editing && (
              <div className="col g8">
                <TextInput size="sm" aria-label="مبلغ تخصیص" value={value} onChange={(event) => setValue(event.target.value)} suffix="میلیارد ریال" />
                <span className="row g6">
                  <AppButton size="xs" variant="ghost" onClick={() => setEditing(false)}>
                    انصراف
                  </AppButton>
                  <AppButton size="xs" variant="primary" loading={state.isLoading} onClick={() => void submit()}>
                    ثبت تخصیص
                  </AppButton>
                </span>
              </div>
            )}
            {error && (
              <Alert tone="err" icon="alert-octagon">
                {error}
              </Alert>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
