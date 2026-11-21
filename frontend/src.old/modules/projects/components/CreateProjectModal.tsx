import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ArrowLeft } from 'lucide-react';

import { AppButton, FormInput, FormTextarea, Modal, RadioGroup, Switch } from '@/shared/components/ui';
import { cn, toPersianDigits } from '@/shared/utils';
import type { CreateProjectDto, ProjectType } from '../types';

// مدال ساخت پروژه — wizard ۴ مرحله‌ای.
// این بخش در designs/Projects.html دکمه‌اش بود ولی modal نبود.
// طبق قاعده تکمیل بخش ناقص، مطابق designs/Modals.html ساخته شد.

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateProjectDto) => void;
}

const STEPS = [
  { key: 'basic', label: 'اطلاعات پایه' },
  { key: 'schedule', label: 'زمان و بودجه' },
  { key: 'team', label: 'تیم' },
  { key: 'structure', label: 'ساختار' },
] as const;

const TYPE_OPTIONS: Array<{ value: ProjectType; label: string }> = [
  { value: 'building', label: 'ساختمان مسکونی' },
  { value: 'commercial', label: 'ساختمان تجاری' },
  { value: 'industrial', label: 'ساختمان صنعتی' },
  { value: 'road', label: 'راه' },
  { value: 'tunnel', label: 'تونل' },
  { value: 'hospital', label: 'بیمارستان' },
  { value: 'energy', label: 'نیروگاه' },
  { value: 'parking', label: 'پارکینگ طبقاتی' },
  { value: 'heritage', label: 'بازسازی میراث' },
];

const schema = z.object({
  name: z.string().min(3, 'نام پروژه حداقل ۳ کاراکتر'),
  code: z
    .string()
    .min(1, 'کد پروژه الزامی است')
    .regex(/^PRJ-\d{4}-\d{3}$/, 'کد باید با فرمت PRJ-YYYY-NNN باشد'),
  employer: z.string().min(2, 'نام کارفرما الزامی است'),
  type: z.enum([
    'building',
    'commercial',
    'industrial',
    'road',
    'tunnel',
    'hospital',
    'energy',
    'parking',
    'heritage',
  ]),
  startDate: z.string().min(1, 'تاریخ شروع الزامی است'),
  endDate: z.string().min(1, 'تاریخ پایان الزامی است'),
  budget: z.coerce.number().min(1, 'بودجه باید بزرگ‌تر از صفر باشد'),
  currency: z.enum(['rial', 'toman', 'dollar', 'euro']),
  managerId: z.coerce.number().min(1, 'مدیر پروژه را انتخاب کنید'),
});

type FormData = z.infer<typeof schema>;

export function CreateProjectModal({ open, onClose, onSubmit }: CreateProjectModalProps) {
  const [step, setStep] = useState(0);
  const [structureChoice, setStructureChoice] = useState<'scratch' | 'upload' | 'template'>(
    'scratch',
  );
  const [managerInTeam, setManagerInTeam] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'rial',
      managerId: 1, // کاربر فعلی (mock)
      type: 'building',
    },
  });

  const close = () => {
    setStep(0);
    onClose();
  };

  const onFinalSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      code: data.code,
      employer: data.employer,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      currency: data.currency,
      managerId: data.managerId,
    });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="ساخت پروژه جدید"
      subtitle="یک پروژه عمرانی جدید ایجاد کنید"
      size="lg"
      footer={
        <>
          {step > 0 && (
            <AppButton variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="w-4 h-4 rotate-180" />
              قبلی
            </AppButton>
          )}
          {step < STEPS.length - 1 ? (
            <AppButton onClick={() => setStep((s) => s + 1)}>
              بعدی
              <ArrowLeft className="w-4 h-4" />
            </AppButton>
          ) : (
            <AppButton onClick={handleSubmit(onFinalSubmit)}>
              <Check className="w-4 h-4" />
              ایجاد پروژه
            </AppButton>
          )}
        </>
      }
    >
      {/* Stepper */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-semibold transition-all flex-shrink-0',
                  idx < step
                    ? 'bg-success-500 text-white'
                    : idx === step
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-400',
                )}
              >
                {idx < step ? <Check className="w-3 h-3" /> : toPersianDigits(idx + 1)}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  idx <= step ? 'text-gray-900 font-medium' : 'text-gray-400',
                )}
              >
                {s.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 rounded-full',
                    idx < step ? 'bg-success-500' : 'bg-gray-100',
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* محتوای مرحله */}
      <div className="p-5 space-y-4">
        {step === 0 && (
          <>
            <FormInput
              label="نام پروژه"
              placeholder="مثلاً مجتمع مسکونی نگین شهر"
              required
              error={errors.name?.message}
              {...register('name')}
            />
            <FormInput
              label="کد پروژه"
              placeholder="PRJ-1404-021"
              required
              ltr
              helperText="کد یکتای پروژه در سازمان. فرمت: PRJ-YYYY-NNN"
              error={errors.code?.message}
              {...register('code')}
            />
            <FormInput
              label="کارفرما"
              placeholder="مثلاً شهرداری تهران"
              required
              error={errors.employer?.message}
              {...register('employer')}
            />
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">
                نوع پروژه <span className="text-error-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'cursor-pointer px-3 py-2 rounded-md border text-sm transition-all',
                      watch('type') === opt.value
                        ? 'border-primary-500 bg-primary-100/40 text-primary-700 font-medium'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                    )}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register('type')}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="تاریخ شروع برنامه‌ای"
                placeholder="۱۴۰۴/۰۳/۱۵"
                required
                ltr
                helperText="شمسی"
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <FormInput
                label="تاریخ پایان برنامه‌ای"
                placeholder="۱۴۰۵/۱۲/۲۹"
                required
                ltr
                helperText="شمسی"
                error={errors.endDate?.message}
                {...register('endDate')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="بودجه کل (میلیارد ریال)"
                type="number"
                placeholder="۸۵۰"
                required
                error={errors.budget?.message}
                {...register('budget')}
              />
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  واحد پول
                </label>
                <select
                  {...register('currency')}
                  className="w-full h-[38px] px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-900 outline-none hover:border-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                >
                  <option value="rial">ریال</option>
                  <option value="toman">تومان</option>
                  <option value="dollar">دلار</option>
                  <option value="euro">یورو</option>
                </select>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <FormInput
              label="مدیر پروژه"
              defaultValue="شما (کاربر فعلی)"
              disabled
              helperText="به‌صورت پیش‌فرض شما مدیر این پروژه خواهید بود"
            />
            <div className="flex items-center justify-between px-3 py-3 rounded-md bg-gray-50 border border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800">افزودن اعضای اولیه</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  می‌توانید بعداً از بخش اعضا کاربران را دعوت کنید
                </div>
              </div>
              <Switch checked={managerInTeam} onChange={setManagerInTeam} />
            </div>
            {managerInTeam && (
              <div className="text-xs text-gray-500">
                اعضای اولیه بعد از ساخت پروژه قابل افزودن هستند.
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">ساختار اولیه WBS را انتخاب کنید:</div>
            {(
              [
                {
                  value: 'scratch',
                  title: 'شروع از صفر',
                  desc: 'WBS را بعداً به‌صورت دستی یا از فایل وارد می‌کنم',
                },
                {
                  value: 'upload',
                  title: 'آپلود از فایل XML / MSP',
                  desc: 'فایل خروجی Microsoft Project را آپلود کنید',
                },
                {
                  value: 'template',
                  title: 'استفاده از قالب پیش‌تعریف‌شده',
                  desc: 'قالب آمادهٔ «ساختمان مسکونی» — ۲۲ آیتم',
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'cursor-pointer px-4 py-3 rounded-md border flex items-start gap-3 transition-all',
                  structureChoice === opt.value
                    ? 'border-primary-500 bg-primary-100/30'
                    : 'border-gray-200 hover:bg-gray-50',
                )}
              >
                <input
                  type="radio"
                  name="structure"
                  checked={structureChoice === opt.value}
                  onChange={() => setStructureChoice(opt.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'w-[18px] h-[18px] rounded-full border flex items-center justify-center mt-0.5 transition-all flex-shrink-0',
                    structureChoice === opt.value
                      ? 'border-[5px] border-primary-500'
                      : 'border-gray-300',
                  )}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{opt.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

void RadioGroup;
void FormTextarea;
