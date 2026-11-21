import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Permission } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { likePattern, normalizeSearch } from '../../../platform/search/normalize.js';
import { AccessResolver } from '../../../platform/security/access.js';
import { FieldRecords } from '../../field/index.js';
import { IdentityService, ProjectCatalog } from '../../identity/index.js';
import { PlanSearch } from '../../planning/index.js';
import { RiskReads } from '../../risks/index.js';
import { COMMANDS } from './search-commands.js';
import { ReportVisibility } from './report-visibility.js';

// `GET /search?q=&kind=&projectId=` — W43 (platform.md ۹؛ تصمیم‌های 1405/08/22). نتیجه‌ها از همهٔ پروژه‌های فعال کاربر و فقط
// موضوع‌هایی که با کد دسترسی و دامنه می‌بیند؛ بی مبلغ؛ حداکثر ۸ نتیجه و در «همه» دو جای آخر برای دستورها. دستورها پشت کد خودشان؛
// دستور زمینه‌ای «ثبت ریسک جدید برای «…»» با پروژهٔ باز و `risk.create` همان پروژه.

export const SEARCH_KINDS = ['wbs', 'risk', 'report', 'person', 'command'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

const LIMIT = 8;
const FETCH = LIMIT * 2;
const GROUP_LABELS: Record<SearchKind, string> = { wbs: 'آیتم‌های WBS', risk: 'ریسک‌ها', report: 'گزارش‌های کارگاه', person: 'افراد', command: 'دستورها' };
const STATUS_TEXT: Record<string, string> = { identified: 'شناسایی‌شده', assessed: 'ارزیابی‌شده', in_action: 'در اقدام', occurred: 'رخ‌داده' };
const LEVEL: Record<string, { text: string; tone: string }> = {
  low: { text: 'کم', tone: 'ok' },
  medium: { text: 'متوسط', tone: 'wrn' },
  high: { text: 'بالا', tone: 'wrn' },
  critical: { text: 'بحرانی', tone: 'err' },
};

interface Result {
  readonly id: string;
  readonly kind: SearchKind;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly iconTone: string;
  readonly badge: { text: string; tone: string } | null;
  readonly shortcut: string | null;
  readonly to: string;
}

@Injectable()
export class GlobalSearch {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly catalog: ProjectCatalog,
    private readonly identity: IdentityService,
    private readonly plans: PlanSearch,
    private readonly risks: RiskReads,
    private readonly records: FieldRecords,
    private readonly reports: ReportVisibility,
    private readonly resolver: AccessResolver,
  ) {}

  async search(input: { readonly q: string; readonly kind: SearchKind | 'all'; readonly projectId: string | null }) {
    // مسیر فقط احراز هویت است؛ دسترسی پروژه‌ها اینجا حل می‌شود (همان الگوی /uploads)
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    if (!this.context.access) this.context.setAccess(await this.resolver.resolve(actor));
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const text = normalizeSearch(input.q).slice(0, 100);
    const pattern = likePattern(text);
    const projects = (await this.catalog.list()).filter((project) => project.status === 'active' || project.status === 'paused');
    const names = new Map(projects.map((project) => [project.id, project.name]));
    const anywhere = (code: Permission) => access.isOrgAdmin || [...access.projects.values()].some((codes) => codes.has(code));
    const allowedIn = (code: Permission, fullOnly = false) =>
      projects
        .map((project) => project.id)
        .filter((id) => access.isOrgAdmin || (fullOnly ? access.projects.get(id)?.get(code) === 'all' : access.projects.get(id)?.has(code)));
    const wanted = (kind: SearchKind) => text !== '' && (input.kind === 'all' || input.kind === kind);

    const people = wanted('person') || wanted('report') ? await this.identity.searchPeople(pattern, FETCH) : [];
    const [wbs, risks, reports] = await Promise.all([
      wanted('wbs') ? this.plans.wbs(allowedIn('wbs.view'), pattern, FETCH) : Promise.resolve([]),
      wanted('risk') ? this.risks.search(allowedIn('risk.view', true), pattern, FETCH) : Promise.resolve([]),
      wanted('report')
        ? this.records.searchReports(
            this.em,
            allowedIn('report.view'),
            pattern,
            people.map((person) => person.id),
            FETCH,
          )
        : Promise.resolve([]),
    ]);
    const visibleReports = await this.reports.visible(reports.map((report) => ({ id: report.id, projectId: report.project_id })));
    const refs = await this.identity.personRefs([
      ...wbs.flatMap((hit) => (hit.supervisorUserId ? [hit.supervisorUserId] : [])),
      ...risks.map((risk) => risk.owner_user_id),
      ...reports.map((report) => report.author_user_id),
    ]);
    const name = (userId: string | null) => (userId ? (refs.get(userId)?.fullName ?? '') : '');

    const byKind: Record<SearchKind, Result[]> = {
      wbs: wbs.map((hit) => ({
        id: `wbs-${hit.id}`,
        kind: 'wbs',
        title: `${toFaDigits(hit.code)} · ${hit.title}`,
        subtitle: [names.get(hit.projectId), name(hit.supervisorUserId)].filter(Boolean).join(' · '),
        icon: 'git-branch',
        iconTone: 'pri',
        badge: hit.isLeaf ? null : { text: 'گروه', tone: 'neu' },
        shortcut: null,
        to: `/projects/${hit.projectId}/wbs?item=${encodeURIComponent(hit.id)}`,
      })),
      risk: risks.map((risk) => ({
        id: `risk-${risk.id}`,
        kind: 'risk',
        title: `${risk.code} · ${risk.title}`,
        subtitle: [
          risk.score !== null ? `امتیاز ${toFaDigits(risk.score)}` : 'ارزیابی‌نشده',
          STATUS_TEXT[risk.status],
          name(risk.owner_user_id),
          names.get(risk.project_id),
        ]
          .filter(Boolean)
          .join(' · '),
        icon: 'shield-alert',
        iconTone: 'err',
        badge: risk.level ? (LEVEL[risk.level] ?? null) : null,
        shortcut: null,
        to: `/projects/${risk.project_id}/risks/${risk.id}`,
      })),
      report: reports
        .filter((report) => visibleReports.has(report.id))
        .map((report) => ({
          id: `report-${report.id}`,
          kind: 'report',
          title: report.report_no,
          subtitle: [name(report.author_user_id), names.get(report.project_id)].filter(Boolean).join(' · '),
          icon: 'clipboard-check',
          iconTone: 'inf',
          badge: null,
          shortcut: null,
          to: `/projects/${report.project_id}/reports?report=${encodeURIComponent(report.id)}`,
        })),
      person:
        wanted('person') && anywhere('users.invite')
          ? people.map((person) => ({
              id: `person-${person.id}`,
              kind: 'person',
              title: person.fullName,
              subtitle: person.jobTitle || 'عضو سازمان',
              icon: 'user',
              iconTone: 'acc',
              badge: null,
              shortcut: null,
              to: `/users?user=${encodeURIComponent(person.id)}`,
            }))
          : [],
      command: this.commands(input, text, anywhere, names),
    };

    const order: SearchKind[] = [...SEARCH_KINDS];
    const counts = [
      { kind: 'all' as const, label: 'همه', count: order.reduce((sum, kind) => sum + byKind[kind].length, 0) },
      ...order.map((kind) => ({ kind, label: GROUP_LABELS[kind], count: byKind[kind].length })).filter((entry) => entry.count > 0),
    ];
    const visible = input.kind === 'all' ? order : [input.kind];
    const reserved = input.kind === 'all' ? Math.min(2, byKind.command.length) : 0;
    let remaining = LIMIT;
    const groups: { kind: SearchKind; label: string; items: Result[] }[] = [];
    for (const kind of visible) {
      if (remaining <= 0 || (kind !== 'command' && remaining - reserved <= 0)) continue;
      const items = byKind[kind].slice(0, kind === 'command' ? remaining : remaining - reserved);
      if (items.length === 0) continue;
      remaining -= items.length;
      groups.push({ kind, label: GROUP_LABELS[kind], items });
    }
    return { groups, total: counts[0]?.count ?? 0, counts };
  }

  private commands(
    input: { readonly q: string; readonly projectId: string | null },
    text: string,
    anywhere: (code: Permission) => boolean,
    names: ReadonlyMap<string, string>,
  ): Result[] {
    const hit = (value: string) => normalizeSearch(value).includes(text);
    const results: Result[] = COMMANDS.filter((command) => !command.code || anywhere(command.code))
      .filter((command) => text === '' || hit(command.title) || hit(command.subtitle) || hit(command.keywords))
      .map((command) => ({
        id: command.id,
        kind: 'command',
        title: command.title,
        subtitle: command.subtitle,
        icon: command.icon,
        iconTone: 'neu',
        badge: null,
        shortcut: command.shortcut,
        to: command.to,
      }));
    const access = this.context.access;
    const projectName = input.projectId ? names.get(input.projectId) : undefined;
    const canCreate = !!input.projectId && !!access && (access.isOrgAdmin || (access.projects.get(input.projectId)?.has('risk.create') ?? false));
    if (text !== '' && projectName && canCreate) {
      const title = input.q.trim().slice(0, 120);
      results.unshift({
        id: 'new-risk-context',
        kind: 'command',
        title: `ثبت ریسک جدید برای «${title}»`,
        subtitle: `در ${projectName}`,
        icon: 'plus',
        iconTone: 'neu',
        badge: null,
        shortcut: 'R',
        to: `/risks?project=${input.projectId}&new=1&title=${encodeURIComponent(title)}`,
      });
    }
    return results;
  }
}
