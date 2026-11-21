import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  Eye,
  Pencil,
  FileDown,
  Archive,
  Users,
} from 'lucide-react';

import { cn } from '@/shared/utils';
import type { ProjectDto } from '../types';

// منوی سه‌نقطه برای هر ردیف پروژه.
// این بخش در designs/Projects.html باز نمی‌شد (فقط آیکن بود) — طبق قاعده تکمیل بخش ناقص،
// این dropdown را مطابق سبک Design System ساختم.

interface ProjectRowMenuProps {
  project: ProjectDto;
}

export function ProjectRowMenu({ project }: ProjectRowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items = [
    {
      icon: Eye,
      label: 'مشاهده جزئیات',
      onClick: () => navigate(`/projects/${project.id}`),
    },
    {
      icon: Pencil,
      label: 'ویرایش پروژه',
      onClick: () => navigate(`/projects/${project.id}/settings`),
    },
    {
      icon: Users,
      label: `اعضا (${project.memberCount})`,
      onClick: () => navigate(`/projects/${project.id}/members`),
    },
    { divider: true },
    {
      icon: FileDown,
      label: 'خروجی Excel',
      onClick: () => {
        // TODO: اتصال به export endpoint
        setOpen(false);
      },
    },
    {
      icon: Archive,
      label: 'آرشیو پروژه',
      onClick: () => {
        // TODO: اتصال به archiveProject mutation
        setOpen(false);
      },
      danger: false,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="w-7 h-7 rounded-md inline-flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="بیشتر"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-52 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in">
          {items.map((item, idx) =>
            'divider' in item ? (
              <div key={idx} className="h-px bg-gray-100 my-1" />
            ) : (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-2.5 text-[13px] text-right transition-colors',
                  'danger' in item && item.danger
                    ? 'text-error-700 hover:bg-error-50'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <item.icon className="w-3.5 h-3.5 text-gray-500" />
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
