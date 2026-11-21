import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, idColumn } from '../../../platform/database/base-properties.js';

/** Organization — `02` ۲. خودش ستون org_id ندارد؛ RLS روی id (docs/backend/05 ۴.۵). */
const OrganizationSchema = defineEntity({
  name: 'Organization',
  tableName: 'organization',
  properties: {
    id: idColumn(),
    name: p.string(),
    seatLimit: p.integer().default(60),
    /** چرخش رمز (F01 ۵.۱)؛ ۰ = خاموش. */
    passwordRotationDays: p.integer().default(90),
    /** «اجباری کردن ورود دومرحله‌ای» (F01 ۵.۶). */
    require2fa: p.boolean().default(false).fieldName('require_2fa'),
    createdAt: createdAtColumn(),
  },
});

export class Organization extends OrganizationSchema.class {}
OrganizationSchema.setClass(Organization);
