import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit3 } from 'lucide-react';

import { Modal, AppButton, FormInput, FormTextarea } from '@/shared/components/ui';
import { useUpdateWbsNodeMutation } from '../api/wbsApi';
import { MOCK_WBS_OWNERS } from '../mocks/wbsTree';
import type { WbsTreeNode, UpdateWbsNodeDto, WeightSource } from '../types';

// مودال ویرایش جزئیات یک آیتم WBS.
// فرم RHF + Zod با اعتبارسنجی. تمام فیلدها optional در patch.

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  node: WbsTreeNode | null;
}

const schema = z.object({
  title: z.string().min(2, 'عنوان حداقل ۲ کاراکتر').max(200, 'عنوان حداکثر ۲۰۰ کاراکتر'),
  weight: z.coerce.number().min(0, 'وزن حداقل ۰').max(100, 'وزن حداکثر ۱۰۰'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  quantity: z.string().optional(),
  quantityUnit: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().max(500, 'یادداشت حداکثر ۵۰۰ کاراکتر').optional(),
  weightSource: z.enum(['manual', 'auto_duration', 'auto_even']).optional(),
});

type FormData = z.infer<typeof schema>;

export function WbsEditModal({ open, onClose, projectId, node }: Props) {
  const [updateNode, { isLoading }] = useUpdateWbsNodeMutation();

  const isLeaf = node?.isLeaf ?? false;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // defaultValues هنگام باز شدن modal ست می‌شود (در useEffect زیر)
  });

  // وقتی node عوض شد، فرم را با مقادیر فعلی پر کن
  // (در یک کامپوننت واقعی useEffect می‌خواهد، ولی چون Modal همیشه mount است، اینجا از key استفاده می‌کنیم)
  // برای سادگی، اینجا فرض می‌کنیم parent این modal را با key mounted می‌کند.

  async function onSubmit(data: FormData) {
    if (!node) return;

    const patch: UpdateWbsNodeDto = {
      title: data.title,
      weight: data.weight,
      weightSource: data.weightSource as WeightSource | undefined,
      notes: data.notes || null,
    };

    if (isLeaf) {
      if (data.startDate) patch.startDate = data.startDate;
      if (data.endDate) patch.endDate = data.endDate;
      if (data.quantity !== undefined && data.quantity !== '') {
        patch.quantity = Number(data.quantity);
      }
      if (data.quantityUnit) patch.quantityUnit = data.quantityUnit;
      if (data.ownerId) patch.ownerId = Number(data.ownerId);
    }

    try {
      await updateNode({ projectId, nodeId: node.id, patch }).unwrap();
      handleClose();
    } catch {
      // خطا توسط middleware سراسری هندل می‌شود
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!node) return null;

  return (
    <Modal
      key={node.id}
      open={open}
      onClose={handleClose}
      size="md"
      title="ویرایش جزئیات آیتم WBS"
      subtitle={`${node.code} · ${node.title}`}
      icon={<Edit3 className="w-5 h-5 text-primary-700" />}
      footer={
        <>
          <AppButton variant="ghost" onClick={handleClose} disabled={isLoading}>
            انصراف
          </AppButton>
          <AppButton onClick={handleSubmit(onSubmit)} isLoading={isLoading}>
            ذخیره تغییرات
          </AppButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        {/* عنوان */}
        <FormInput
          label="عنوان آیتم"
          defaultValue={node.title}
          error={errors.title?.message}
          {...register('title')}
        />

        {/* وزن + منبع وزن */}
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="وزن نسبی (٪)"
            type="number"
            defaultValue={String(node.weight)}
            error={errors.weight?.message}
            ltr
            {...register('weight')}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-gray-800">منبع وزن</label>
            <select
              defaultValue={node.weightSource}
              {...register('weightSource')}
              className="h-[38px] px-2.5 border border-gray-200 rounded-md text-[13px] text-gray-900 outline-none focus:border-primary-500"
            >
              <option value="manual">دستی</option>
              <option value="auto_duration">خودکار (بر اساس مدت)</option>
              <option value="auto_even">خودکار (توزیع یکنواخت)</option>
            </select>
          </div>
        </div>

        {/* فقط leaf: تاریخ‌ها، مقدار، سرپرست */}
        {isLeaf && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="تاریخ شروع (Gregorian YYYY-MM-DD)"
                defaultValue={node.startDate ?? ''}
                ltr
                {...register('startDate')}
              />
              <FormInput
                label="تاریخ پایان (Gregorian YYYY-MM-DD)"
                defaultValue={node.endDate ?? ''}
                ltr
                {...register('endDate')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="مقدار کل"
                type="number"
                defaultValue={node.quantity !== null ? String(node.quantity) : ''}
                ltr
                {...register('quantity')}
              />
              <FormInput
                label="واحد"
                defaultValue={node.quantityUnit ?? ''}
                {...register('quantityUnit')}
              />
            </div>

            {/* سرپرست */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-gray-800">سرپرست مسئول</label>
              <select
                defaultValue={node.ownerId ? String(node.ownerId) : ''}
                {...register('ownerId')}
                className="h-[38px] px-2.5 border border-gray-200 rounded-md text-[13px] text-gray-900 outline-none focus:border-primary-500"
              >
                <option value="">— بدون سرپرست —</option>
                {MOCK_WBS_OWNERS.map((o) => (
                  <option key={o.id} value={o.id}>{o.fullName}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* یادداشت */}
        <FormTextarea
          label="یادداشت (اختیاری)"
          rows={3}
          defaultValue={node.notes ?? ''}
          error={errors.notes?.message}
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
