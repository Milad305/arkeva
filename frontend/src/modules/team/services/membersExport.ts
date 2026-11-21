import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { formatJalaliDateTime } from '@/shared/utils/date';
import type { MemberDto } from '../types';
import { appStatusView, roleLabel } from './teamView';

/**
 * «خروجی اعضا» W16 — CSV سمت مرورگر از همان ردیف‌های صفحه (تصمیم 1405/08/27)؛ فقط `team.manage` چون موبایل دارد
 * (تصمیم 1405/08/15).
 */
export function exportMembers(project: { code: string }, members: MemberDto[]): void {
  downloadCsv(
    `members-${project.code}`,
    toCsv(members, [
      { header: 'نام', value: (member) => member.fullName },
      { header: 'موبایل', value: (member) => member.mobile },
      { header: 'نقش‌ها', value: (member) => member.roles.map(roleLabel).join('، ') },
      { header: 'مسئولیت', value: (member) => member.responsibility },
      { header: 'فعالیت‌های سپرده‌شده', value: (member) => member.assignedCount },
      {
        header: 'اپ اندروید',
        value: (member) =>
          member.roles.includes('supervisor') ? appStatusView(member.app).text : 'وب',
      },
      { header: 'وضعیت', value: (member) => (member.status === 'active' ? 'فعال' : 'غیرفعال') },
      { header: 'آخرین فعالیت', value: (member) => formatJalaliDateTime(member.lastActiveAt) },
    ]),
  );
}
