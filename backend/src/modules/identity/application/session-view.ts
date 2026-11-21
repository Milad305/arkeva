import { Injectable, Optional } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  PERMISSION_CODES,
  widerScope,
  type GrantedPermission,
  type Permission,
  type PermissionScope,
  type SessionClient,
  type UserStatus,
} from '@projeyar/shared';
import { AccessTokens } from '../../../platform/security/access-tokens.js';
import { AccessResolver } from '../../../platform/security/access.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { Organization } from '../domain/organization.entity.js';
import type { User, UserPreferences } from '../domain/user.entity.js';

// نشستی که فرانت در store می‌گذارد (frontend `SessionDto`). توکن تازه‌سازی عمداً در بدنه نیست؛
// فقط در کوکی HttpOnly (docs/backend/07 ۲).

export interface UserView {
  readonly id: string;
  readonly fullName: string;
  readonly mobile: string;
  readonly email: string | null;
  readonly twoFactorEnabled: boolean;
  readonly status: UserStatus;
  readonly isOrgAdmin: boolean;
  readonly lastActiveAt: string | null;
  readonly jobTitle: string | null;
  readonly department: string | null;
  readonly passwordChangedAt: string | null;
  readonly lockedUntil: string | null;
  /** رنگ آواتار (§۷.۲ ردیف ۲۲). */
  readonly avatarTone: string;
  readonly preferences: UserPreferences;
}

export interface OrganizationView {
  readonly id: string;
  readonly name: string;
  readonly seatLimit: number;
  readonly activeProjectCount: number;
}

export interface SessionView {
  readonly accessToken: string;
  readonly expiresInSec: number;
  readonly user: UserView;
  readonly organization: OrganizationView;
  /** اجتماع نقش‌ها در پروژه‌ها؛ فقط نمایشی. */
  readonly rolesInProject: string[];
  /** اجتماع دسترسی‌ها با وسیع‌ترین scope (F01 ۵.۲). */
  readonly permissions: GrantedPermission[];
}

/** شمار پروژه‌های فعال سازمان — پیاده‌سازی را ماژول projects می‌دهد (وارونگی وابستگی، 01 ۷). */
export abstract class OrganizationStats {
  abstract activeProjectCount(orgId: string): Promise<number>;
}

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

export function toUserView(user: User): UserView {
  return {
    id: user.id,
    fullName: user.fullName,
    mobile: user.mobile,
    email: user.email ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    status: user.status,
    isOrgAdmin: user.isOrgAdmin,
    lastActiveAt: iso(user.lastActiveAt),
    jobTitle: user.jobTitle ?? null,
    department: user.department ?? null,
    passwordChangedAt: iso(user.passwordChangedAt),
    lockedUntil: iso(user.lockedUntil),
    avatarTone: user.avatarTone,
    preferences: user.preferences,
  };
}

@Injectable()
export class SessionViewBuilder {
  constructor(
    private readonly em: EntityManager,
    private readonly tokens: AccessTokens,
    private readonly access: AccessResolver,
    @Optional() private readonly stats?: OrganizationStats,
  ) {}

  /** پس از commit صدا زده می‌شود تا نشست تازه دیده شود. */
  async build(user: User, sessionId: string, client: SessionClient = 'web'): Promise<SessionView> {
    const actor = { userId: user.id, orgId: user.orgId, sessionId, client };
    const [token, organization, access] = await Promise.all([
      this.tokens.sign(actor),
      this.em.findOne(Organization, { id: user.orgId }),
      this.access.resolve(actor),
    ]);
    if (!organization) throw new UnauthorizedError('SESSION_EXPIRED');

    return {
      accessToken: token.token,
      expiresInSec: token.expiresInSec,
      user: toUserView(user),
      organization: {
        id: organization.id,
        name: organization.name,
        seatLimit: organization.seatLimit,
        activeProjectCount: (await this.stats?.activeProjectCount(user.orgId)) ?? 0,
      },
      rolesInProject: [...(access.isOrgAdmin ? ['org_admin'] : []), ...access.roleCodes],
      permissions: access.isOrgAdmin ? PERMISSION_CODES.map((code) => ({ code, scope: 'all' as const })) : union(access.projects),
    };
  }
}

function union(projects: ReadonlyMap<string, ReadonlyMap<Permission, PermissionScope>>): GrantedPermission[] {
  const merged = new Map<Permission, PermissionScope>();
  for (const codes of projects.values()) {
    for (const [code, scope] of codes) {
      const current = merged.get(code);
      merged.set(code, current ? widerScope(current, scope) : scope);
    }
  }
  return [...merged].map(([code, scope]) => ({ code, scope }));
}
