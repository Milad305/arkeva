import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setCommandPaletteOpen, toggleCommandPalette } from '@/app/store/uiSlice';
import { InlineLoading } from '@/shared/components/feedback/Skeleton';
import { Badge } from '@/shared/components/ui/Badge';
import { Chip } from '@/shared/components/ui/Chip';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { Kbd } from '@/shared/components/ui/Kbd';
import { useFocusTrap, useScrollLock } from '@/shared/hooks/useFocusTrap';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';
import { toFaDigits } from '@/shared/utils/num';
import { useSearchQuery } from '../api/searchApi';
import { pushRecent, readRecent } from '../services/recentSearches';
import type { RecentEntryDto, SearchKind, SearchResultDto } from '../types';

const KIND_LABELS: Array<{ key: SearchKind | 'all'; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'wbs', label: 'WBS' },
  { key: 'risk', label: 'ریسک' },
  { key: 'report', label: 'گزارش کارگاه' },
  { key: 'person', label: 'افراد' },
  { key: 'command', label: 'دستورها' },
];

/**
 * W43 — جستجوی سریع (F20؛ `platform.md` ۹).
 *
 * Ctrl+K همه‌جا باز می‌کند؛ نتایج زنده از همهٔ پروژه‌های کاربر با حداکثر هشت مورد،
 * ↑ ↓ حرکت، ↵ بازکردن، Ctrl+↵ در زبانهٔ جدید و Esc بستن. پیش از تایپ، کارهای سریع
 * و بازدیدهای اخیر دیده می‌شود.
 */
export function CommandPalette() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.commandPaletteOpen);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = null } = useParams();

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<SearchKind | 'all'>('all');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<RecentEntryDto[]>([]);

  const access = {
    projectCreate: useHasPermission('project.create'),
    riskCreate: useHasPermission('risk.create'),
    mspImport: useHasPermission('msp.import'),
    templatesView: useHasPermission('templates.view'),
    reportsView: useHasPermission('reports.view'),
    usersInvite: useHasPermission('users.invite'),
    riskView: useHasPermission('risk.view'),
    fieldReportView: useHasPermission('report.view'),
  };

  // پروژهٔ باز از مسیر — برای دستور زمینه‌ای «ثبت ریسک برای …»
  const openProjectId = useMemo(() => {
    if (projectId) return projectId;
    const match = /\/projects\/([^/?]+)/.exec(location.pathname);
    return match ? match[1]! : null;
  }, [projectId, location.pathname]);

  useKeyboardShortcut('ctrl+k', () => dispatch(toggleCommandPalette()), { allowWhileTyping: true });

  const results = useSearchQuery(
    { text, kind, access, projectId: openProjectId },
    { skip: !isOpen },
  );

  const flat = useMemo(() => (results.data?.groups ?? []).flatMap((group) => group.items), [results.data]);
  const flatRef = useRef(flat);
  const activeRef = useRef(active);
  const closeRef = useRef(() => {});
  const openRef = useRef<(result: SearchResultDto, newTab: boolean) => void>(() => {});
  flatRef.current = flat;
  activeRef.current = active;

  useEffect(() => {
    if (!isOpen) return;
    setRecent(readRecent());
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActive(0);
  }, [text, kind]);

  useFocusTrap(isOpen, panelRef);
  useScrollLock(isOpen);

  // پیمایش با صفحه‌کلید روی سطح سند تا فوکوس روی ورودی یا روی ردیف‌ها فرقی نکند
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const count = flatRef.current.length;
        if (count === 0) return;
        setActive((index) => (event.key === 'ArrowDown' ? (index + 1) % count : (index - 1 + count) % count));
        return;
      }
      if (event.key === 'Enter') {
        const result = flatRef.current[activeRef.current];
        if (!result) return;
        event.preventDefault();
        openRef.current(result, event.ctrlKey || event.metaKey);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const close = () => {
    dispatch(setCommandPaletteOpen(false));
    setText('');
    setKind('all');
  };

  const open = (result: SearchResultDto | RecentEntryDto, newTab = false) => {
    if ('kind' in result) pushRecent(result);
    if (newTab) {
      window.open(result.to, '_blank', 'noopener');
      return;
    }
    close();
    navigate(result.to);
  };

  closeRef.current = close;
  openRef.current = open;

  if (!isOpen) return null;

  const showEmptyState = text.trim() === '';

  return createPortal(
    // بستن با کلیک روی پشت‌زمینه یک راحتی موشی است؛ Esc هم همیشه هست.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="pj backdrop cmdk-backdrop"
      dir="rtl"
      lang="fa"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="جستجوی سریع"
        className="modal cmdk"
      >
        <div className="row g10 cmdk-head">
          <span className="tx5" style={{ display: 'inline-flex' }}>
            <Icon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="cmdk-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="نام آیتم، کد، ریسک، شمارهٔ گزارش یا نام فرد"
            aria-label="جستجو در کل سیستم"
          />
          {!showEmptyState && <Badge size="sm">{`${toFaDigits(results.data?.total ?? 0)} نتیجه`}</Badge>}
          <Kbd>esc</Kbd>
        </div>

        <div className="row g6 wrap cmdk-filters">
          {KIND_LABELS.filter(
            (entry) => entry.key === 'all' || (results.data?.counts ?? []).some((count) => count.kind === entry.key),
          ).map((entry) => (
            <Chip key={entry.key} selected={kind === entry.key} onClick={() => setKind(entry.key)}>
              {entry.label}
            </Chip>
          ))}
        </div>

        <div className="cmdk-body">
          {results.isFetching && flat.length === 0 && <InlineLoading label="در حال جستجو…" />}

          {!results.isFetching && !showEmptyState && flat.length === 0 && (
            <div className="col g8" style={{ padding: '22px 16px', alignItems: 'center' }}>
              <IconBox icon="search-x" tone="neu" size="lg" />
              <span className="t-13 fw6 tx9">نتیجه‌ای پیدا نشد</span>
              <span className="t-12 tx6">
                {kind === 'all' ? 'املای دیگری را امتحان کنید یا کد آیتم را بنویسید.' : 'دستهٔ «همه» را بزنید تا در همهٔ موضوع‌ها بگردد.'}
              </span>
              {kind !== 'all' && (
                <button type="button" className="link t-12" onClick={() => setKind('all')}>
                  برداشتن فیلتر دسته
                </button>
              )}
            </div>
          )}

          {showEmptyState && recent.length > 0 && (
            <>
              <span className="mgl">بازدیدهای اخیر</span>
              {recent.map((entry) => (
                <button key={entry.id} type="button" className="mi cmdk-item" onClick={() => open(entry)}>
                  <IconBox icon={entry.icon} tone={entry.iconTone} size="sm" />
                  <span className="col grow" style={{ gap: 1, minWidth: 0 }}>
                    <span className="t-13 tx9 trunc">{entry.title}</span>
                    <span className="t-xs tx5 trunc">{entry.subtitle}</span>
                  </span>
                  <Icon name="history" size={13} />
                </button>
              ))}
            </>
          )}

          {(results.data?.groups ?? []).map((group) => (
            <div key={group.kind} className="col">
              <span className="mgl">{showEmptyState && group.kind === 'command' ? 'کارهای سریع' : group.label}</span>
              {group.items.map((item) => {
                const index = flat.indexOf(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={index === active ? 'mi cmdk-item on' : 'mi cmdk-item'}
                    onMouseEnter={() => setActive(index)}
                    onClick={(event) => open(item, event.ctrlKey || event.metaKey)}
                  >
                    <IconBox icon={item.icon} tone={item.iconTone} size="sm" />
                    <span className="col grow" style={{ gap: 1, minWidth: 0 }}>
                      <span className="t-13 tx9 trunc">{item.title}</span>
                      <span className="t-xs tx5 trunc">{item.subtitle}</span>
                    </span>
                    {item.badge && (
                      <Badge size="sm" tone={item.badge.tone}>
                        {item.badge.text}
                      </Badge>
                    )}
                    {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                    {index === active && <Kbd>↵</Kbd>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="row g16 t-xs tx5 cmdk-foot">
          <span className="row g4">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            حرکت
          </span>
          <span className="row g4">
            <Kbd>↵</Kbd>
            بازکردن
          </span>
          <span className="row g4">
            <Kbd>Ctrl ↵</Kbd>
            در زبانهٔ جدید
          </span>
          <span className="ms-auto">نتایج زنده از همهٔ پروژه‌ها</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
