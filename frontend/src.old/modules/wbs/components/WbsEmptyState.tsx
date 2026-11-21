import { UploadCloud, Upload, FileDown, Plus, FileCode, FileSpreadsheet, File } from 'lucide-react';

import { AppButton } from '@/shared/components/ui';
import { toPersianDigits } from '@/shared/utils';
import { useHasPermission } from '@/shared/hooks/useHasAccess';

// حالت خالی WBS — مطابق designs/WBS.html empty-state.
// وقتی درخت WBS پروژه خالی است، این نمایش داده می‌شود.

interface Props {
  onUploadClick: () => void;
  onBuildManually: () => void;
}

export function WbsEmptyState({ onUploadClick, onBuildManually }: Props) {
  const canImport = useHasPermission('wbs.import');
  const canCreate = useHasPermission('wbs.create');

  return (
    <div className="flex items-center justify-center h-full p-8 bg-gray-50">
      <div className="w-full max-w-[560px] bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center transition-colors hover:border-primary-500 hover:bg-[#F8FAFD]">
        {/* آیکن */}
        <div className="w-16 h-16 rounded-lg bg-primary-100 text-primary-700 inline-flex items-center justify-center mb-4 mx-auto">
          <UploadCloud className="w-[30px] h-[30px]" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 m-0 mb-1.5">
          هنوز ساختار WBS این پروژه ساخته نشده است
        </h3>
        <p className="text-[13px] text-gray-600 m-0 mb-[18px] leading-[1.7]">
          فایل XML خروجی از Microsoft Project یا فایل Excel ساختار را اینجا
          <br />
          رها کنید — یا یکی از گزینه‌های زیر را انتخاب کنید.
        </p>

        <div className="flex gap-2 justify-center flex-wrap">
          {canImport && (
            <AppButton onClick={onUploadClick} leftIcon={<Upload className="w-3.5 h-3.5" />}>
              انتخاب فایل…
            </AppButton>
          )}
          {canImport && (
            <AppButton variant="outline" leftIcon={<FileDown className="w-3.5 h-3.5" />}>
              <span>دانلود قالب Excel</span>
            </AppButton>
          )}
          {canCreate && (
            <AppButton variant="ghost" onClick={onBuildManually} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              <span>ساخت دستی WBS</span>
            </AppButton>
          )}
        </div>

        {/* نوع فایل‌ها */}
        <div className="flex items-center justify-center gap-[18px] mt-6">
          <FileTypeChip icon={<FileCode className="w-[18px] h-[18px]" />} label="MSP Export" tag="XML" tagBg="#1A3354" />
          <FileTypeChip icon={<FileSpreadsheet className="w-[18px] h-[18px]" />} label="Excel" tag="XLSX" tagBg="#15803D" />
          <FileTypeChip icon={<File className="w-[18px] h-[18px]" />} label="MS Project" tag="MPP" tagBg="#B45813" />
        </div>

        {/* جداکننده «یا» */}
        <div className="text-[11px] text-gray-400 my-5 flex items-center gap-2">
          <span className="flex-1 h-px bg-gray-200" />
          <span>یا</span>
          <span className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-[11.5px] text-gray-500 m-0">
          فقط فایل‌های با حداکثر حجم <strong>{toPersianDigits(20)} مگابایت</strong> پشتیبانی می‌شوند. برای فایل‌های بزرگتر با پشتیبانی تماس بگیرید.
        </p>
      </div>
    </div>
  );
}

function FileTypeChip({
  icon,
  label,
  tag,
  tagBg,
}: {
  icon: React.ReactNode;
  label: string;
  tag: string;
  tagBg: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-[11px] text-gray-500">
      <div className="w-[38px] h-[46px] border border-gray-200 rounded-[4px] inline-flex items-center justify-center text-gray-500 relative bg-gray-50">
        {icon}
        <span
          className="absolute bottom-1 left-1 right-1 text-[8px] font-bold text-white text-center py-px rounded-[2px]"
          style={{ backgroundColor: tagBg }}
        >
          {tag}
        </span>
      </div>
      <span>{label}</span>
    </div>
  );
}
