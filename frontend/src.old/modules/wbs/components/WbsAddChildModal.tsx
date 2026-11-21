import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Modal, AppButton, FormInput, RadioGroup } from '@/shared/components/ui';
import { useCreateWbsNodeMutation } from '../api/wbsApi';
import type { WbsTreeNode } from '../types';

// مودال افزودن فرزند به یک آیتم parent.

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  parent: WbsTreeNode | null;
}

export function WbsAddChildModal({ open, onClose, projectId, parent }: Props) {
  const [createNode, { isLoading }] = useCreateWbsNodeMutation();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [isLeaf, setIsLeaf] = useState<'leaf' | 'parent'>('leaf');
  const [weight, setWeight] = useState('');

  if (!parent) return null;

  // پیشنهاد code بعدی
  const suggestedCode = `${parent.code}.${parent.children.length + 1}`;

  function reset() {
    setTitle('');
    setCode('');
    setIsLeaf('leaf');
    setWeight('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!title.trim() || !weight) return;
    const finalCode = code.trim() || suggestedCode;

    try {
      await createNode({
        projectId,
        parentId: parent!.id,
        title: title.trim(),
        code: finalCode,
        isLeaf: isLeaf === 'leaf',
        weight: Number(weight),
      }).unwrap();
      handleClose();
    } catch {
      // خطا توسط middleware سراسری هندل می‌شود
    }
  }

  const isValid = title.trim() !== '' && weight !== '' && Number(weight) >= 0 && Number(weight) <= 100;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      title="افزودن فرزند"
      subtitle={`${parent.code} · ${parent.title}`}
      icon={<Plus className="w-5 h-5 text-success-500" />}
      footer={
        <>
          <AppButton variant="ghost" onClick={handleClose} disabled={isLoading}>
            انصراف
          </AppButton>
          <AppButton onClick={handleSubmit} isLoading={isLoading} disabled={!isValid}>
            افزودن
          </AppButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <FormInput
          label="عنوان آیتم"
          placeholder="مثلاً «بتن‌ریزی سقف طبقهٔ سوم»"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="کد"
            placeholder={suggestedCode}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            ltr
          />
          <FormInput
            label="وزن نسبی (٪)"
            type="number"
            placeholder="0-100"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            ltr
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-gray-800">نوع آیتم</label>
          <RadioGroup
            name="isLeaf"
            value={isLeaf}
            onChange={(v) => setIsLeaf(v as 'leaf' | 'parent')}
            options={[
              { value: 'leaf', label: 'برگ (قابل گزارش‌گیری)', description: 'فعالیت قابل اندازه‌گیری، مانند بتن‌ریزی' },
              { value: 'parent', label: 'والد (سرشاخه)', description: 'مجموعه‌ای از فعالیت‌های فرعی' },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
