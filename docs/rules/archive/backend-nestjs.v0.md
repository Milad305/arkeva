> **بایگانی 1405/08/21 — معتبر نیست.** این نسخه پیش از اسناد `design/` نوشته شده بود و با C01، C04، D07 و D12 تعارض داشت. جایگزین: `docs/backend/` (فهرست تعارض‌ها در `docs/backend/README.md` ۵). فقط برای سابقه نگه داشته شده.

# قواعد بک‌اند — NestJS + TypeORM + PostgreSQL

> این فایل مرجع حقیقی استانداردهای بک‌اند پروژه‌یار است. قبل از نوشتن هر کدی در `backend/`، این فایل را کامل بخوان. الگوهای ساختاری از معماری NestJS modular پیروی می‌کنند، ولی بخش‌های entity/auth/data برای تطابق با تصمیمات معماری این پروژه بازنویسی شده‌اند.

---

## ۱. استک فنی

| لایه | انتخاب |
|---|---|
| Framework | NestJS 11+ |
| زبان | TypeScript strict |
| ORM | TypeORM |
| DB | PostgreSQL 16+ (با افزونه `ltree`) |
| Auth | JWT (access + refresh) + Passport |
| اعتبارسنجی | class-validator + class-transformer |
| مستندسازی | Swagger/OpenAPI |
| هش رمز | bcrypt |
| Migration | **فایل‌های SQL خام** در `migrations/` (نه auto-generated) |

---

## ۲. ساختار پروژه

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                    # پیکربندی (database, app)
│   ├── common/                    # مشترکات
│   │   ├── constants/             # ثابت‌های اپلیکیشن
│   │   ├── decorators/            # decoratorهای سفارشی (@Permissions, @LogActivity, @CurrentUser)
│   │   ├── guards/                # JwtAuthGuard, PermissionsGuard, OrgGuard
│   │   ├── interceptors/          # ActivityLoggingInterceptor و غیره
│   │   ├── filters/               # HttpExceptionFilter
│   │   └── interfaces/            # interfaceهای مشترک
│   └── modules/                   # ماژول‌های feature-based
│       ├── auth/
│       ├── organizations/
│       ├── users/
│       ├── roles/                 # کتابخانه نقش‌ها (org-level)
│       ├── projects/
│       ├── wbs/
│       ├── cbs/
│       ├── links/                 # اتصال WBS↔CBS
│       ├── members/
│       ├── assignments/           # تخصیص WBS به سرپرستان
│       ├── field-reports/
│       ├── settings/
│       ├── activity-log/
│       └── alerts/
├── migrations/                    # فایل‌های SQL خام، شماره‌دار
├── seeds/                         # داده اولیه
└── permissions.catalog.ts         # منبع حقیقت کاتالوگ دسترسی‌ها (در root src)
```

هر ماژول:
```
module-name/
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
├── dto/
├── entities/
└── guards/            # فقط guard مخصوص ماژول
```

---

## ۳. Entityها — قواعد حیاتی (با تصمیمات معماری هم‌خوان)

### ۳.۱ شناسه اولیه — **bigint IDENTITY، نه UUID**

```typescript
@PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
id: number;
```

> **قاعده**: همه جداول bigint استفاده می‌کنند. UUID **ممنوع** (مگر تصمیم صریح آینده برای sync موبایل). دلیل: پرفرکانس، ایندکس سریع، خوانا. برای ltree هم باید bigint باشد.

### ۳.۲ Multi-tenancy — هر جدول داده‌ای ستون `organization_id` دارد

```typescript
@Column({ name: 'organization_id', type: 'bigint' })
organizationId: number;
```

هر کوئری داده‌ای **باید** با `WHERE organization_id = :currentOrg` فیلتر شود (مترجماً با guard/middleware یا در خود service). هیچ کوئری cross-org بدون تأیید صریح مجاز نیست.

### ۳.۳ ساختار درختی (WBS, CBS) — adjacency list + ltree

```typescript
@Entity('wbs_items')
export class WbsItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'organization_id', type: 'bigint' })
  organizationId: number;

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @ManyToOne(() => WbsItem, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id' })
  parent: WbsItem | null;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: number | null;

  @Column({ length: 100 })           // برچسب انسانی پایدار، یکتا در پروژه
  code: string;

  @Column({ name: 'materialized_path', type: 'ltree' })  // از زنجیره id، نه code
  materializedPath: string;

  @Column()
  title: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })   // وزن نسبی در والد
  weight: number;

  @Column({ name: 'weight_source', type: 'enum', enum: WeightSource, default: WeightSource.MANUAL })
  weightSource: WeightSource;

  @Column()
  isLeaf: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'depth', type: 'int' })
  depth: number;

  @Column({ name: 'external_ref', type: 'varchar', nullable: true })  // GUID از MSP
  externalRef: string | null;

  // ... فیلدهای تخصصی WBS/CBS
}
```

**نکات حیاتی ltree:**
- `materialized_path` از **زنجیره `id`** ساخته می‌شود، نه از `code`. مثلاً اگر parent path = `12` و id = `78`، path = `12.78`.
- این یعنی جابه‌جایی (drag-drop) فقط `parent_id` و `materialized_path` را عوض می‌کند، ولی `code` ثابت می‌ماند. ارجاعات (`id`-محور) نمی‌شکنند.
- تریگر INSERT/UPDATE در SQL خام `materialized_path` و `depth` را هماهنگ نگه می‌دارد (در migration).
- کوئری زیردرخت: `WHERE materialized_path <@ '12.45'` با GIST index — آنی.

### ۳.۴ Enumها — با PgNative enum، تعریف‌شده در migration SQL

```typescript
// در entity
@Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.DRAFT })
status: ProjectStatus;

// در TypeScript (src/common/constants/enums.ts یا کنار entity)
export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}
```

همه enumهای محصول:
`OrgRole` (owner/admin/member), `ProjectStatus`, `ProjectType`, `Currency`, `CostType` (material/labor/equip/sub/overhead/transport), `MemberStatus` (active/inactive), `FieldReportItemStatus` (pending/approved/rejected/edit), `FieldReportOverallStatus`, `ConnectionState` (online/offline), `ApprovalLevels` (one_step/two_step), `ProgressCalcMethod` (duration_weighted/cost_weighted/both), `WeightSource` (manual/auto_duration/auto_even), `BackupFrequency`, `IntegrationType` (msp/erp/accounting), `IntegrationStatus`, `EventType`, `AlertSeverity`, `AlertType`, `ExportFormat`, `WbsImportStatus`, `MembershipStatus` (active/inactive/pending_invite).

---

## ۴. احراز هویت و RBAC (بازنویسی‌شده — نه enum ثابت)

این بخش با الگوی enum ساده `UserRole` **متفاوت** است. محصول نقش‌های کاستوم دارد.

### ۴.۱ مدل دو لایه نقش

**لایه سازمان** (ساده، enum): `organization_memberships.org_role` — `owner`/`admin`/`member`. کنترل سطح سازمان: دعوت کاربر، ساخت پروژه، مدیریت کتابخانه نقش‌ها.

**لایه پروژه** (انعطاف‌پذیر، کاتالوگ دسترسی):
- `roles` (org-level) — کتابخانه نقش‌ها. ۴ پیش‌فرض با `is_system = true` (قابل ویرایش، غیرقابل حذف) + نقش‌های کاستوم ادمین
- `role_permissions` (junction) — نقش کدام دسترسی‌ها را دارد
- `project_members` — عضویت در پروژه با `role_id` (nullable برای کاملاً دستی)
- `project_member_permissions` — **snapshot نهایی** دسترسی‌های این فرد در این پروژه (مستقل از نقش پس از تخصیص)

### ۴.۲ کاتالوگ دسترسی‌ها — منبع حقیقت در کد

```typescript
// src/permissions.catalog.ts
export const PERMISSIONS = {
  // Project
  'project.view': 'مشاهده پروژه و داشبورد',
  'project.create': 'ساخت پروژه جدید',
  'project.edit': 'ویرایش اطلاعات پروژه',
  // ... ~۳۸ کلید
} as const;

export type Permission = keyof typeof PERMISSIONS;
```

> **قاعده توسعه‌پذیری**: هر فیچر جدید که قابل محدودسازی به نقش است، **باید** کلید `<module>.<action>` به این کاتالوگ اضافه شود. هیچ فیچری بدون RBAC پیاده نشود.

### ۴.۳ decorator و guard دسترسی

```typescript
// common/decorators/permissions.decorator.ts
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

// استفاده در controller
@Post('wbs')
@RequirePermissions('wbs.create')
create(@Body() dto: CreateWbsItemDto) { ... }
```

```typescript
// common/guards/permissions.guard.ts — بر اساس project_member_permissions چک کن، نه نقش
```

### ۴.۴ منطق تخصیص دسترسی (snapshot model)

هنگام افزودن عضو به پروژه، سه حالت:
1. **انتخاب نقش از کتابخانه** → کپی دسترسی‌های نقش در `project_member_permissions`
2. **ساخت از صفر** → `role_id` خالی، ادمین دستی چک‌باکس می‌زند
3. **نقش + شخصی‌سازی** → کپی، بعد override

پس از تخصیص، `project_member_permissions` مستقل از نقش است. دکمه «همگام‌سازی با نقش» برای به‌روزرسانی اختیاری.

---

## ۵. تاریخ‌ها — Gregorian در DB، شمسی در اپ

```typescript
@Column({ name: 'planned_start_date', type: 'date', nullable: true })
plannedStartDate: Date | null;   // همیشه Gregorian
```

> **قاعده**: هرگز تاریخ شمسی به‌صورت رشته در DB ذخیره نکن. تبدیل فقط در لایه اپ (خروجی API یا فرانت). کتابخانه پیشنهادی: `dayjs` با plugin جلالی یا `jalaali-js`. توابع تاریخ PG (روزهای سپری‌شده، محدوده، تقویم کاری) باید روی Gregorian کار کنند.

تعطیلات: جدول `holidays` با ستون `date` (Gregorian) + `name`.

---

## ۶. الگوهای DTO، Service، Controller

### ۶.۱ DTO — با class-validator و Swagger

```typescript
export class CreateProjectDto {
  @ApiProperty({ description: 'نام پروژه', example: 'مجتمع مسکونی نگین شهر' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'کد یکتای پروژه در سازمان', example: 'PRJ-1404-021' })
  @IsString()
  @Matches(/^PRJ-\d{4}-\d{3}$/, { message: 'کد پروژه باید با فرمت PRJ-YYYY-NNN باشد' })
  code: string;

  @ApiProperty({ description: 'شناسه سازمان', example: 1 })
  @IsInt()
  @IsPositive()
  organizationId: number;
}
```

- همه فیلدها `@ApiProperty` با description و example فارسی دارند.
- پیام‌های خطای validation به فارسی.
- DTOهای create و update جدا.

### ۶.۲ Service — منطق در اینجا، نه controller

```typescript
@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  async create(dto: CreateProjectDto, currentOrgId: number): Promise<Project> {
    // ولیدیشن یکتایی کد در سازمان
    const exists = await this.repo.findOne({
      where: { organizationId: currentOrgId, code: dto.code },
    });
    if (exists) throw new ConflictException('این کد پروژه قبلاً استفاده شده است');

    const project = this.repo.create({ ...dto, organizationId: currentOrgId });
    return this.repo.save(project);
  }

  async findOne(id: number, currentOrgId: number): Promise<Project> {
    const project = await this.repo.findOne({
      where: { id, organizationId: currentOrgId },  // همیشه با org فیلتر کن
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');
    return project;
  }
}
```

- همیشه `organization_id` را در کوئری فیلتر کن (مگر تصمیم صریح).
- `NotFoundException`, `ConflictException`, `BadRequestException` با پیام فارسی.
- برای عملیات پیچیده (مثل ساخت پروژه با WBS اولیه) از transaction استفاده کن.

### ۶.۳ Controller — نازک، فقط هندل HTTP

```typescript
@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermissions('project.create')
  @ApiOperation({ summary: 'ساخت پروژه جدید' })
  @ApiResponse({ status: 201, type: Project })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentOrg() orgId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<Project> {
    return this.projectsService.create(dto, orgId);
  }
}
```

- `@ApiTags`, `@ApiOperation`, `@ApiResponse` برای همه endpointها.
- `@CurrentOrg()` و `@CurrentUser()` decorator سفارشی، نه `req.user` مستقیم.

---

## ۷. Migration — فایل‌های SQL خام

```
migrations/
├── 20260723120000-extensions-and-enums.sql
├── 20260723130000-identity-access.sql
├── 20260723140000-projects-members.sql
├── 20260723150000-wbs-tree-ltree.sql
└── ...
```

> **قاعده**: migrationها دست‌نویس هستند، نه auto-generated. این برای کنترل کامل ltree/triggers/enums ضروری است.

هر migration شامل:
- `CREATE TYPE ... AS ENUM (...)` برای enumها
- `CREATE EXTENSION IF NOT EXISTS ltree;`
- **تريگرهای ltree** — تریگر INSERT/UPDATE که `materialized_path` و `depth` را از `parent_id`/زنجیره id بازسازی می‌کند
- GIST index روی `materialized_path`
- CHECK constraintها (مثلاً `weight BETWEEN 0 AND 100`)

نمونه تریگر هماهنگ‌سازی path:
```sql
CREATE OR REPLACE FUNCTION sync_wbs_path() RETURNS trigger AS $$
DECLARE
  parent_path ltree;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.materialized_path := NEW.id::text::ltree;
    NEW.depth := 1;
  ELSE
    SELECT materialized_path INTO parent_path FROM wbs_items WHERE id = NEW.parent_id;
    NEW.materialized_path := parent_path || NEW.id::text::ltree;
    NEW.depth := nlevel(parent_path) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wbs_path_sync
  BEFORE INSERT OR UPDATE OF parent_id ON wbs_items
  FOR EACH ROW EXECUTE FUNCTION sync_wbs_path();
```

---

## ۸. Soft delete — فقط برای موجودیت‌های top-level

```typescript
// فقط organizations, projects, users
@DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
deletedAt: Date | null;

// فقط projects
@Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
archivedAt: Date | null;
```

> **قاعده**: WBS/CBS و سایر موجودیت‌های درختی/فرعی soft delete ندارند. حذف واقعی + اعتبارسنجی ارجاعی (نمی‌توان حذف کرد اگر گزارش/اتصال/فرزند دارد) یا `archived_at` برای archive.

---

## ۹. Activity Log

```typescript
@Entity('activity_log')
export class ActivityLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'organization_id', type: 'bigint' })
  organizationId: number;

  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

  @Column({ name: 'actor_user_id', type: 'bigint', nullable: true })  // null برای سیستمی
  actorUserId: number | null;

  @Column({ name: 'event_type', type: 'enum', enum: EventType })
  eventType: EventType;

  @Column({ name: 'entity_type', type: 'varchar' })
  entityType: string;

  @Column({ name: 'entity_id', type: 'bigint' })
  entityId: number;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

از طریق `@LogActivity` decorator و `ActivityLoggingInterceptor` پر می‌شود.

---

## ۱۰. Auth — JWT access + refresh

- **Access token**: کوتاه‌مدت (۱۵ دقیقه)، در Authorization header.
- **Refresh token**: بلندمدت، در httpOnly cookie (وب) یا secure storage (موبایل). قابل revocation در DB.
- استراتژی `passport-jwt`.
- OTP اختیاری per organization (mock در dev، SMS gateway واقعی در prod).
- قفل موقت حساب بعد از تلاش‌های ناموفق (ستون `failed_login_attempts`, `locked_until`).

---

## ۱۱. قواعد کیفیت

- **بدون `synchronize: true`** در production. همیشه migration.
- **همیشه `organization_id` در کوئری فیلتر کن** (مگر تصمیم صریح).
- **Transaction برای عملیات چندجدولی** (مثلاً ساخت پروژه با WBS اولیه).
- **`@Exclude()`** برای فیلدهای حساس (password) + `ClassSerializerInterceptor`.
- پیام‌های خطا و موفقیت به **فارسی طبیعی**.
- Swagger همه endpointها مستند شده (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
- تست واحد برای serviceها، e2e برای endpointها.

---

## ۱۲. مرجع بصری

وقتی entity یا endpointی برای یکی از صفحات `designs/` می‌سازی، فایل HTML مربوطه را باز کن و فیلدها/حالت‌ها را دقیقاً مطابقت بده. مثلاً:
- `designs/WBS.html` → entity `WbsItem` و APIهای `/wbs`
- `designs/FieldReports v2.html` → entityهای `FieldReport`, `FieldReportItem`, `ReportPhoto`
- `designs/Settings.html` → entity `ProjectSettings` + جداول notification/holiday/integration/backup
