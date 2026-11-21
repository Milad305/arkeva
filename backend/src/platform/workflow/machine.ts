import type { ErrorCode, Permission } from '@projeyar/shared';
import { ConflictError, DomainError, ForbiddenError } from '../http/errors.js';

// موتور گردش کار (docs/backend/08 ۶). هر گردش کار یک تعریف اعلانی در domain/ ماژول مالک است و هر
// انتقال از همین دروازه می‌گذرد: وجود انتقال ← حالت مبدأ ← دسترسی ← دلیل ← نگهبان ← مقصد ← setStatus.
// موتور پایگاه داده و رویداد را نمی‌شناسد؛ فرمان مالک خروجی را در همان تراکنش ثبت می‌کند.

export type GuardResult = { readonly ok: true } | { readonly ok: false; readonly code: ErrorCode; readonly details?: Record<string, unknown> };

export const ok = (): GuardResult => ({ ok: true });
export const fail = (code: ErrorCode, details?: Record<string, unknown>): GuardResult => ({ ok: false, code, details });

export interface TransitionContext {
  /** کدهای دسترسی بازیگر در همین موضوع؛ `all` برای مدیر سازمان یا کار سیستم. */
  readonly permissions: ReadonlySet<Permission> | 'all';
  readonly reason?: string | null;
  readonly now: Date;
}

export interface TransitionDef<S extends string, Subject, Ctx extends TransitionContext> {
  readonly from: readonly S[];
  readonly to: S | ((subject: Subject, ctx: Ctx) => S);
  readonly permission: Permission;
  readonly guard?: (subject: Subject, ctx: Ctx) => GuardResult;
  readonly requiresReason?: boolean;
  /** برچسب فارسی برای نمودار و پیام. */
  readonly label: string;
}

export interface MachineDef<S extends string, A extends string, Subject, Ctx extends TransitionContext> {
  readonly name: string;
  readonly states: readonly S[];
  readonly initial: S;
  readonly status: (subject: Subject) => S;
  /** نوشتن وضعیت فقط از موتور. */
  readonly setStatus: (subject: Subject, to: S, ctx: Ctx) => void;
  readonly transitions: Readonly<Record<A, TransitionDef<S, Subject, Ctx>>>;
}

export interface AppliedTransition<S extends string, A extends string> {
  readonly action: A;
  readonly from: S;
  readonly to: S;
}

export interface Machine<S extends string, A extends string, Subject, Ctx extends TransitionContext> {
  readonly def: MachineDef<S, A, Subject, Ctx>;
  /** انتقال‌هایی که از این حالت با این دسترسی‌ها ممکن‌اند (برای منوی رابط). */
  available(subject: Subject, ctx: Ctx): A[];
  apply(subject: Subject, action: A, ctx: Ctx): AppliedTransition<S, A>;
}

const hasPermission = (ctx: TransitionContext, permission: Permission): boolean => ctx.permissions === 'all' || ctx.permissions.has(permission);

export function defineMachine<S extends string, A extends string, Subject, Ctx extends TransitionContext>(
  def: MachineDef<S, A, Subject, Ctx>,
): Machine<S, A, Subject, Ctx> {
  const transitionOf = (action: A): TransitionDef<S, Subject, Ctx> => {
    const transition = def.transitions[action] as TransitionDef<S, Subject, Ctx> | undefined;
    if (!transition) throw new Error(`انتقال ${action} در گردش کار ${def.name} تعریف نشده است`);
    return transition;
  };

  return {
    def,
    available(subject, ctx) {
      const from = def.status(subject);
      return (Object.keys(def.transitions) as A[]).filter((action) => {
        const transition = transitionOf(action);
        return transition.from.includes(from) && hasPermission(ctx, transition.permission);
      });
    },
    apply(subject, action, ctx) {
      const transition = transitionOf(action);
      const from = def.status(subject);
      if (!transition.from.includes(from)) {
        throw new ConflictError('TRANSITION_NOT_ALLOWED', { machine: def.name, action, from });
      }
      if (!hasPermission(ctx, transition.permission)) {
        throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: transition.permission });
      }
      if (transition.requiresReason && !ctx.reason?.trim()) throw new DomainError('REASON_REQUIRED', 422, { action });
      const verdict = transition.guard?.(subject, ctx) ?? ok();
      if (!verdict.ok) throw new DomainError(verdict.code, 409, { action, ...verdict.details });
      const to = typeof transition.to === 'function' ? transition.to(subject, ctx) : transition.to;
      def.setStatus(subject, to, ctx);
      return { action, from, to };
    },
  };
}

/** نمودار mermaid از تعریف (08 ۶: سند و کد از هم جدا نمی‌شوند). */
export function toMermaid<S extends string, A extends string, Subject, Ctx extends TransitionContext>(def: MachineDef<S, A, Subject, Ctx>): string {
  const lines = ['stateDiagram-v2', `  [*] --> ${def.initial}`];
  for (const action of Object.keys(def.transitions) as A[]) {
    const transition = def.transitions[action];
    if (typeof transition.to !== 'string') continue;
    for (const from of transition.from) lines.push(`  ${from} --> ${transition.to}: ${transition.label} (${transition.permission})`);
  }
  return lines.join('\n');
}
