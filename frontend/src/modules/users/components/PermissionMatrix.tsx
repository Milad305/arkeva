import { Fragment, useState, type CSSProperties } from 'react';

import type { GrantedPermission, Permission, PermissionScope } from '@/config/permissions';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { SCOPE_SHORT } from '../services/permissionView';
import type { CatalogGroupDto, CatalogRowDto, RoleDto } from '../types';


type CellState = { kind: 'on' | 'part' | 'off'; note: string | null };

/** حالت یک ردیف W27 برای یک نقش: کامل، محدود (زیرمجموعهٔ کدها یا دامنهٔ کوچک‌تر) یا بدون دسترسی. */
function rowState(row: CatalogRowDto, grants: GrantedPermission[]): CellState {
  const granted = row.codes.map((code) => grants.find((entry) => entry.code === code.code)).filter((entry): entry is GrantedPermission => Boolean(entry));
  if (granted.length === 0) return { kind: 'off', note: null };
  if (granted.length < row.codes.length) return { kind: 'part', note: `${toFaDigits(granted.length)} از ${toFaDigits(row.codes.length)}` };
  const narrow = granted.find((entry) => entry.scope !== 'all');
  return narrow ? { kind: 'part', note: SCOPE_SHORT[narrow.scope] } : { kind: 'on', note: null };
}

const key = (entry: GrantedPermission | undefined) => (entry ? `${entry.code}:${entry.scope}` : '');

export interface PermissionMatrixProps {
  roles: RoleDto[];
  catalog: CatalogGroupDto[];
  /** دسترسی پیش‌نویس هر نقش (تغییر ذخیره‌نشده یا همان سرور). */
  grantsOf: (role: RoleDto) => GrantedPermission[];
  onChange: (role: RoleDto, grants: GrantedPermission[]) => void;
  roleMenu: (role: RoleDto) => MenuEntry[];
  readOnly: boolean;
}

/**
 * ماتریس W27 (F01 ۵.۳–۵.۴): ردیف‌های بوم که هر کدام به کدهای ۵.۴ باز می‌شوند (تصمیم 1405/08/19).
 * خانهٔ ردیف همه را با هم روشن/خاموش می‌کند؛ خانهٔ کد دامنهٔ داده را می‌گیرد. مدیر سازمان قفل است.
 */
export function PermissionMatrix({ roles, catalog, grantsOf, onChange, roleMenu, readOnly }: PermissionMatrixProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const grid: CSSProperties = { gridTemplateColumns: `minmax(200px, 290px) repeat(${roles.length}, minmax(108px, 1fr))`, minWidth: 200 + roles.length * 108 };
  const toggleOpen = (rowKey: string) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });

  const toggleRow = (role: RoleDto, row: CatalogRowDto) => {
    const grants = grantsOf(role);
    const state = rowState(row, grants);
    const codes = new Set<Permission>(row.codes.map((code) => code.code));
    const missing = row.codes.filter((code) => !grants.some((entry) => entry.code === code.code));
    if (state.kind === 'off' || (state.kind === 'part' && missing.length > 0))
      onChange(role, [...grants, ...missing.map((code) => ({ code: code.code, scope: 'all' as const }))]);
    else onChange(role, grants.filter((entry) => !codes.has(entry.code)));
  };

  const setScope = (role: RoleDto, code: Permission, scope: PermissionScope | '') => {
    const rest = grantsOf(role).filter((entry) => entry.code !== code);
    onChange(role, scope ? [...rest, { code, scope }] : rest);
  };

  return (
    <div className="tbl-wrap">
      <div className="pm-grid pm-head" style={grid} role="row">
        <div className="pm-label" role="columnheader">
          <span className="t-xs fw6 tx5">دسترسی</span>
        </div>
        {roles.map((role) => {
          const menu = roleMenu(role);
          return (
            <div key={role.id} className="pm-role" role="columnheader">
              <span className="row g6" style={{ minWidth: 0 }}>
                <span className="pm-dot" style={{ background: role.color }} />
                <span className="t-12 fw6 tx9 trunc">{role.name}</span>
                {menu.length > 0 && !readOnly && (
                  <Menu entries={menu} trigger={(props) => <IconButton {...props} icon="more-vertical" size="sm" label={`گزینه‌های نقش ${role.name}`} />} />
                )}
              </span>
              <span className="row g4 t-xs tx5 nowrap">
                {role.kind === 'admin' && <Icon name="lock" size={11} />}
                {role.mobileOnly && <Icon name="smartphone" size={11} />}
                {`${toFaDigits(role.userCount)} کاربر · ${role.kind === 'custom' ? 'سفارشی' : role.mobileOnly ? 'اندروید' : 'سیستمی'}`}
              </span>
              {role.modified && <span className="t-xs tx-acc">تغییر از پیش‌فرض</span>}
            </div>
          );
        })}
      </div>

      {catalog.map((group) => (
        <Fragment key={group.key}>
          <div className="pm-group" style={{ minWidth: grid.minWidth }}>
            <Icon name={group.icon} size={14} className="tx6" />
            <span className="t-12 fw6 tx8">{group.title}</span>
            <span className="t-xs tx5">{`${toFaDigits(group.rows.length)} دسترسی`}</span>
          </div>
          {group.rows.map((row) => {
            const expanded = open.has(row.key);
            return (
              <Fragment key={row.key}>
                <div className="pm-grid pm-row" style={grid}>
                  <div className="pm-label">
                    <button type="button" className="pm-expand" aria-expanded={expanded} aria-label={`${expanded ? 'بستن' : 'نمایش'} کدهای «${row.title}»`} onClick={() => toggleOpen(row.key)}>
                      <Icon name={expanded ? 'chevron-down' : 'chevron-left'} size={14} />
                    </button>
                    <span className="col" style={{ gap: 1, minWidth: 0 }}>
                      <span className="t-13 fw5 tx9">{row.title}</span>
                      <span className="t-xs tx5">{row.description}</span>
                    </span>
                  </div>
                  {roles.map((role) => {
                    const state = rowState(row, grantsOf(role));
                    const saved = rowState(row, role.grants);
                    const changed = row.codes.some((code) => key(grantsOf(role).find((entry) => entry.code === code.code)) !== key(role.grants.find((entry) => entry.code === code.code)));
                    const locked = role.kind === 'admin' || readOnly;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={cn('pm-cell', changed && 'chg', role.kind === 'admin' && 'locked')}
                        disabled={locked}
                        aria-pressed={state.kind === 'on' ? true : state.kind === 'part' ? 'mixed' : false}
                        aria-label={`${role.name} — ${row.title}: ${state.kind === 'on' ? 'کامل' : state.kind === 'part' ? `محدود (${state.note})` : 'بدون دسترسی'}${changed ? '، تغییر ذخیره‌نشده' : ''}`}
                        title={changed ? `پیش از تغییر: ${saved.kind === 'on' ? 'کامل' : saved.kind === 'part' ? `محدود (${saved.note})` : 'بدون دسترسی'}` : undefined}
                        onClick={() => toggleRow(role, row)}
                      >
                        <span className={cn('cb', state.kind === 'on' && 'on', state.kind === 'part' && 'part')}>{state.kind === 'on' && <Icon name="check" size={12} />}</span>
                        {state.note && <span className="t-xs pm-note">{state.note}</span>}
                        {changed && <span className="pm-chg" aria-hidden />}
                      </button>
                    );
                  })}
                </div>
                {expanded &&
                  row.codes.map((code) => (
                    <div key={code.code} className="pm-grid pm-row pm-code" style={grid}>
                      <div className="pm-label" style={{ paddingInlineStart: 42 }}>
                        <span className="col" style={{ gap: 1, minWidth: 0 }}>
                          <span className="t-12 tx8">{code.label}</span>
                          <span className="mono t-xs tx5" dir="ltr" style={{ textAlign: 'right' }}>
                            {code.code}
                          </span>
                        </span>
                      </div>
                      {roles.map((role) => {
                        const current = grantsOf(role).find((entry) => entry.code === code.code);
                        const changed = key(current) !== key(role.grants.find((entry) => entry.code === code.code));
                        return (
                          <div key={role.id} className={cn('pm-cell', changed && 'chg', role.kind === 'admin' && 'locked')}>
                            {role.kind === 'admin' ? (
                              <span className="cb on" aria-label="کامل؛ غیرقابل تغییر">
                                <Icon name="check" size={12} />
                              </span>
                            ) : (
                              <select
                                className="pm-scope"
                                value={current?.scope ?? ''}
                                disabled={readOnly}
                                aria-label={`${role.name} — ${code.label}`}
                                onChange={(event) => setScope(role, code.code, event.target.value as PermissionScope | '')}
                              >
                                <option value="">—</option>
                                {(Object.keys(SCOPE_SHORT) as PermissionScope[]).map((scope) => (
                                  <option key={scope} value={scope}>
                                    {SCOPE_SHORT[scope]}
                                  </option>
                                ))}
                              </select>
                            )}
                            {changed && <span className="pm-chg" aria-hidden />}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
