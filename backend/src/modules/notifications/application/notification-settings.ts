import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, UnauthorizedError } from '../../../platform/http/errors.js';
import { AccountNotifications, type AccountNotificationsView, DeviceTokens } from '../../identity/index.js';
import type { ProjectNotificationMatrix } from '../../projects/index.js';
import {
  type Channel,
  CHANNELS,
  type ChannelState,
  MANDATORY,
  MATRIX,
  MATRIX_BY_CODE,
  matrixState,
  PREFERENCE_GROUPS,
  URGENT_SMS,
  groupOf,
} from '../domain/rules/channels.js';
import { NotificationChannelSetting, NotificationPreference, NotificationUserSetting } from '../domain/settings.entities.js';

// ماتریس اعلان W30 و ترجیح شخصی W32 (notifications.md ۴.۲، ۵.۱، ۵.۴؛ تصمیم‌های 1405/08/24). پیامک برای رویداد غیرفوری
// روشن نمی‌شود (AC-NT-01)؛ ترجیح کاربر فقط کاهنده است و in_app و اعلان الزامی خاموش نمی‌شوند.

const invalid = (reason: string) => new DomainError('NOTIFICATION_SETTING_INVALID', 422, { reason });

export interface MatrixRowView {
  readonly code: string;
  readonly label: string;
  readonly recipients: string;
  readonly channels: Record<Channel, ChannelState>;
}

export interface QuietHours {
  readonly enabled: boolean;
  readonly from: string;
  readonly to: string;
}

const QUIET_DEFAULT: QuietHours = { enabled: true, from: '21:00', to: '07:00' };

@Injectable()
export class NotificationSettings extends AccountNotifications implements ProjectNotificationMatrix {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly devices: DeviceTokens,
  ) {
    super();
  }

  /** وضعیت ماتریس یک کد در پروژه (یا null برای کد بیرون از ماتریس W30). */
  async matrixFor(projectId: string | null, codes: readonly string[], em: EntityManager = this.em): Promise<Map<string, Record<Channel, ChannelState>>> {
    const inMatrix = codes.filter((code) => MATRIX_BY_CODE.has(code));
    if (inMatrix.length === 0) return new Map();
    const rows = await em.find(NotificationChannelSetting, {
      code: { $in: inMatrix },
      ...(projectId ? { $or: [{ projectId }, { projectId: null }] } : { projectId: null }),
    });
    const level = (code: string, project: string | null) => {
      const values: Partial<Record<Channel, boolean>> = {};
      for (const row of rows) if (row.code === code && (row.projectId ?? null) === project) values[row.channel] = row.enabled;
      return values;
    };
    return new Map(
      inMatrix.map((code) => [
        code,
        matrixState(MATRIX_BY_CODE.get(code) as (typeof MATRIX)[number], { org: level(code, null), project: projectId ? level(code, projectId) : {} }),
      ]),
    );
  }

  /** `GET /projects/:pid/notification-matrix` و بخش `notifications` تنظیمات. */
  async matrix(projectId: string): Promise<MatrixRowView[]> {
    const states = await this.matrixFor(
      projectId,
      MATRIX.map((row) => row.code),
    );
    return MATRIX.map((row) => ({ code: row.code, label: row.label, recipients: row.recipients, channels: states.get(row.code) ?? { ...row.channels } }));
  }

  /** `PUT /projects/:pid/notification-matrix {code, channel, on}` — یک خانه. */
  async setChannel(
    projectId: string,
    orgId: string,
    input: { readonly code: string; readonly channel: Channel; readonly on: boolean },
  ): Promise<MatrixRowView[]> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const row = MATRIX_BY_CODE.get(input.code);
    if (!row) throw invalid('این رویداد در ماتریس اعلان نیست.');
    const base = row.channels[input.channel];
    if (input.channel === 'sms' && input.on && !URGENT_SMS.has(input.code)) throw invalid('پیامک فقط برای رویدادهای فوری روشن می‌شود.');
    if (base === 'na') throw invalid('این کانال برای این رویداد قابل‌استفاده نیست.');
    if (base === 'locked_on') throw invalid('این کانال الزامی است و خاموش نمی‌شود.');
    await this.em.transactional(async (tx) => {
      const existing = await tx.findOne(NotificationChannelSetting, { projectId, code: input.code, channel: input.channel });
      const now = this.clock.now();
      if (existing) Object.assign(existing, { enabled: input.on, updatedByUserId: actor.userId, updatedAt: now });
      else
        tx.create(NotificationChannelSetting, {
          id: newId(),
          orgId,
          projectId,
          code: input.code,
          channel: input.channel,
          enabled: input.on,
          updatedByUserId: actor.userId,
          updatedAt: now,
        });
      this.audit.record(tx, {
        action: 'notification_matrix.changed',
        entityType: 'Project',
        entityId: projectId,
        projectId,
        after: { code: input.code, channel: input.channel, on: input.on },
      });
    });
    return this.matrix(projectId);
  }

  /** ترجیح شخصی گروه‌ها و ساعت آرام (W32). */
  async view(userId: string): Promise<AccountNotificationsView> {
    const [prefs, setting, contacts] = await Promise.all([
      this.em.find(NotificationPreference, { userId }),
      this.em.findOne(NotificationUserSetting, { userId }),
      this.devices.contacts([userId]),
    ]);
    const contact = contacts.get(userId);
    const groups = PREFERENCE_GROUPS.map((group) => {
      const off = prefs.find((pref) => pref.groupKey === group.key)?.channels ?? {};
      const mandatory = group.key === 'assignment';
      const state = (channel: Channel, available: boolean): ChannelState => {
        if (channel === 'in_app') return 'locked_on';
        if (!available) return 'na';
        if (mandatory) return 'locked_on';
        return off[channel] === false ? 'off' : 'on';
      };
      // پیامک فقط گروه‌هایی که رویداد فوری دارند؛ پوش فقط کاربر اپ؛ ایمیل فقط با نشانی
      const sms = ['field', 'risks', 'assignment'].includes(group.key);
      return {
        key: group.key,
        label: group.label,
        description: group.description,
        channels: {
          in_app: state('in_app', true),
          email: state('email', !!contact?.email),
          push: state('push', (contact?.pushTokens.length ?? 0) > 0),
          sms: state('sms', sms),
        },
      };
    });
    return { groups, quietHours: setting ? { enabled: setting.quietEnabled, from: setting.quietFrom, to: setting.quietTo } : { ...QUIET_DEFAULT } };
  }

  /** `PUT /me/notification-preferences` — فقط کاهنده؛ in_app و الزامی‌ها عوض نمی‌شوند. */
  async save(input: {
    readonly groups: readonly { readonly key: string; readonly channels: Partial<Record<Channel, string>> }[];
    readonly quietHours?: QuietHours;
  }) {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      for (const group of input.groups) {
        if (!PREFERENCE_GROUPS.some((entry) => entry.key === group.key)) throw invalid(`گروه ${group.key} ناشناخته است.`);
        if (group.key === 'assignment') continue;
        const channels: Record<string, boolean> = {};
        for (const channel of CHANNELS) {
          if (channel === 'in_app') continue;
          const value = group.channels[channel];
          if (value === 'off') channels[channel] = false;
        }
        await tx.upsert(
          NotificationPreference,
          { userId: actor.userId, groupKey: group.key, orgId: actor.orgId, channels, updatedAt: now },
          { onConflictFields: ['userId', 'groupKey'], onConflictAction: 'merge' },
        );
      }
      if (input.quietHours) {
        const time = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!time.test(input.quietHours.from) || !time.test(input.quietHours.to)) throw invalid('ساعت آرام را به شکل ۲۱:۰۰ بنویسید.');
        await tx.upsert(
          NotificationUserSetting,
          {
            userId: actor.userId,
            orgId: actor.orgId,
            quietEnabled: input.quietHours.enabled,
            quietFrom: input.quietHours.from,
            quietTo: input.quietHours.to,
            updatedAt: now,
          },
          { onConflictFields: ['userId'], onConflictAction: 'merge' },
        );
      }
    });
    return this.view(actor.userId);
  }

  /** ترجیح و ساعت آرام گیرندگان (Notifier): کانال‌های خاموش هر گروه. */
  async recipientSettings(userIds: readonly string[], code: string, em: EntityManager = this.em) {
    if (userIds.length === 0) return new Map<string, { off: Set<Channel>; quiet: QuietHours }>();
    const group = groupOf(code);
    const [prefs, settings] = await Promise.all([
      em.find(NotificationPreference, { userId: { $in: [...userIds] }, groupKey: group }),
      em.find(NotificationUserSetting, { userId: { $in: [...userIds] } }),
    ]);
    return new Map(
      userIds.map((userId) => {
        const pref = prefs.find((entry) => entry.userId === userId);
        const setting = settings.find((entry) => entry.userId === userId);
        const off = new Set<Channel>(MANDATORY.has(code) ? [] : CHANNELS.filter((channel) => pref?.channels[channel] === false));
        return [userId, { off, quiet: setting ? { enabled: setting.quietEnabled, from: setting.quietFrom, to: setting.quietTo } : QUIET_DEFAULT }];
      }),
    );
  }
}
