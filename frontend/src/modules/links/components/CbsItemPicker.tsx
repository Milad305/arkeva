import { useId, useMemo, useRef, useState } from 'react';

import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import { Icon } from '@/shared/components/ui/Icon';
import type { EntityId } from '@/shared/types/api';
import type { LinkCbsOptionDto } from '../types';

export interface CbsItemPickerProps {
  options: LinkCbsOptionDto[];
  /** قلم‌هایی که این برگ از پیش به آن‌ها وصل است. */
  excludedIds: ReadonlySet<EntityId>;
  value: EntityId | null;
  onChange: (id: EntityId | null) => void;
  disabled?: boolean;
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/**
 * «انتخاب قلم CBS (جستجو)» در ردیف افزودن اتصال W15 — combobox با فهرست برگ‌های CBS.
 * فلش بالا و پایین حرکت، Enter انتخاب، Escape بستن.
 */
export function CbsItemPicker({
  options,
  excludedIds,
  value,
  onChange,
  disabled,
}: CbsItemPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.id === value) ?? null;

  const filtered = useMemo(() => {
    const term = normalize(query);
    return options.filter(
      (option) =>
        !excludedIds.has(option.id) &&
        (!term ||
          normalize(option.title).includes(term) ||
          option.code.toLowerCase().includes(term)),
    );
  }, [options, excludedIds, query]);

  function choose(option: LinkCbsOptionDto) {
    onChange(option.id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
      <label className="fld sm" style={{ height: 30 }}>
        <Icon name="search" size={13} />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="انتخاب قلم CBS"
          disabled={disabled}
          value={open ? query : selected ? `${selected.code} · ${selected.title}` : ''}
          placeholder="انتخاب قلم CBS (کد یا عنوان)"
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            if (value) onChange(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, filtered.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && open && filtered[active]) {
              event.preventDefault();
              choose(filtered[active]!);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </label>
      {open && (
        <div
          id={listId}
          role="listbox"
          className="menu"
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            top: 34,
            zIndex: 20,
            width: 340,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <span className="t-12 tx6" style={{ padding: 10 }}>
              قلمی پیدا نشد. قلم تازه را در حالت ویرایش CBS بسازید.
            </span>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={index === active}
                className="mi"
                style={{ background: index === active ? 'var(--gray-100)' : undefined }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <CostTypeTag type={option.costType} compact />
                <span className="mono t-xs tx5" dir="ltr">
                  {option.code}
                </span>
                <span className="grow trunc">{option.title}</span>
                <span className="t-xs tx5">
                  {option.pricingMode === 'lump_sum' ? 'مقطوع' : (option.unit ?? '')}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
