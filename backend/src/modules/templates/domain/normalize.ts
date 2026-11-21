import { CONTENT_SCHEMA_VERSION, COST_TYPES, METHODS, SETTINGS_DEFAULTS, type TemplateContent, type TemplateSettings } from './content.js';

// شکل محتوای پیش‌نویس از بیرون (`PUT /templates/:id/draft`؛ templates.md ۴). فقط شکل و ارجاع‌ها؛ قواعد انتشار با validate.

export class TemplateContentError extends Error {}

type Raw = Record<string, unknown>;

const fail = (reason: string): never => {
  throw new TemplateContentError(reason);
};
const obj = (value: unknown, at: string): Raw => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : fail(`${at} باید شیء باشد.`));
const arr = (value: unknown, at: string): unknown[] => (Array.isArray(value) ? value : fail(`${at} باید فهرست باشد.`));
const str = (value: unknown, at: string, max = 300): string => {
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) fail(`${at} متن نامعتبر است.`);
  return (value as string).trim();
};
const optStr = (value: unknown, at: string): string | null => (value === null || value === undefined || value === '' ? null : str(value, at, 40));
const num = (value: unknown, at: string, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${at} باید عددی بین ${min} و ${max} باشد.`);
  return value as number;
};
const int = (value: unknown, at: string, min: number, max: number): number => {
  const parsed = num(value, at, min, max);
  if (!Number.isInteger(parsed)) fail(`${at} باید عدد صحیح باشد.`);
  return parsed;
};
const oneOf = <T extends string>(value: unknown, options: readonly T[], at: string): T =>
  options.includes(value as T) ? (value as T) : fail(`${at} یکی از ${options.join('، ')} باشد.`);
const bool = (value: unknown, at: string): boolean => (typeof value === 'boolean' ? value : fail(`${at} باید درست یا نادرست باشد.`));

function settingsOf(raw: unknown): TemplateSettings {
  const value = obj(raw ?? {}, 'settings');
  const pick = <K extends keyof TemplateSettings>(key: K, read: (input: unknown, at: string) => TemplateSettings[K]): TemplateSettings[K] =>
    value[key] === undefined ? SETTINGS_DEFAULTS[key] : read(value[key], `settings.${key}`);
  return {
    weightGenerator: pick('weightGenerator', (input, at) => oneOf(input, ['manual', 'cost', 'duration', 'equal'] as const, at)),
    warningThreshold: pick('warningThreshold', (input, at) => num(input, at, 0, 100)),
    criticalThreshold: pick('criticalThreshold', (input, at) => num(input, at, 0, 100)),
    eacMethod: pick('eacMethod', (input, at) => oneOf(input, ['cpi', 'remaining', 'composite'] as const, at)),
    minPhotos: pick('minPhotos', (input, at) => int(input, at, 0, 20)),
    maxJumpPct: pick('maxJumpPct', (input, at) => num(input, at, 0, 100)),
    allowDecrease: pick('allowDecrease', bool),
    approvalMode: pick('approvalMode', (input, at) => oneOf(input, ['single_stage', 'two_stage'] as const, at)),
    stage2OnCritical: pick('stage2OnCritical', bool),
    stage2OnJump: pick('stage2OnJump', bool),
    stage2OnGpsOut: pick('stage2OnGpsOut', bool),
    stage2OnCriticalPath: pick('stage2OnCriticalPath', bool),
    reviewDeadlineHours: pick('reviewDeadlineHours', (input, at) => int(input, at, 1, 720)),
    onDeadline: pick('onDeadline', (input, at) => oneOf(input, ['remind_only', 'escalate'] as const, at)),
    autoApproveEnabled: pick('autoApproveEnabled', bool),
    autoApproveMaxDelta: pick('autoApproveMaxDelta', (input, at) => num(input, at, 0, 100)),
  };
}

/** محتوای خام ← TemplateContent؛ کلید تکراری، والد ناموجود و اتصال به غیربرگ رد می‌شود. */
export function normalizeContent(input: unknown): TemplateContent {
  const raw = obj(input, 'content');
  const wbsRaw = arr(raw['wbs'], 'wbs');
  const cbsRaw = arr(raw['cbs'] ?? [], 'cbs');
  if (wbsRaw.length > 5000 || cbsRaw.length > 2000) fail('قالب بیش از اندازه بزرگ است.');
  const wbs = wbsRaw.map((entry, index) => {
    const row = obj(entry, `wbs[${index}]`);
    const at = `wbs[${index}]`;
    const steps = arr(row['steps'] ?? [], `${at}.steps`).map((step, position) => {
      const value = obj(step, `${at}.steps[${position}]`);
      return {
        key: str(value['key'], `${at}.steps.key`, 60),
        title: str(value['title'], `${at}.steps.title`),
        weight: num(value['weight'], `${at}.steps.weight`, 0, 100),
      };
    });
    return {
      key: str(row['key'], `${at}.key`, 60),
      parentKey: row['parentKey'] === null || row['parentKey'] === undefined ? null : str(row['parentKey'], `${at}.parentKey`, 60),
      code: typeof row['code'] === 'string' ? row['code'] : '',
      title: str(row['title'], `${at}.title`),
      sortOrder: int(row['sortOrder'] ?? index, `${at}.sortOrder`, 0, 100_000),
      isMilestone: row['isMilestone'] === undefined ? false : bool(row['isMilestone'], `${at}.isMilestone`),
      weightInParent: num(row['weightInParent'] ?? 0, `${at}.weightInParent`, 0, 100),
      measurementMethod:
        row['measurementMethod'] === null || row['measurementMethod'] === undefined
          ? null
          : oneOf(row['measurementMethod'], METHODS, `${at}.measurementMethod`),
      steps,
      unit: optStr(row['unit'], `${at}.unit`),
      startOffsetWd: int(row['startOffsetWd'] ?? 0, `${at}.startOffsetWd`, 0, 100_000),
      durationWd: int(row['durationWd'] ?? 1, `${at}.durationWd`, 0, 100_000),
      areaKey: row['areaKey'] === null || row['areaKey'] === undefined ? null : str(row['areaKey'], `${at}.areaKey`, 60),
    };
  });
  const cbs = cbsRaw.map((entry, index) => {
    const row = obj(entry, `cbs[${index}]`);
    const at = `cbs[${index}]`;
    return {
      key: str(row['key'], `${at}.key`, 60),
      parentKey: row['parentKey'] === null || row['parentKey'] === undefined ? null : str(row['parentKey'], `${at}.parentKey`, 60),
      code: str(row['code'], `${at}.code`, 60),
      title: str(row['title'], `${at}.title`),
      costType: oneOf(row['costType'], COST_TYPES, `${at}.costType`),
      unit: optStr(row['unit'], `${at}.unit`),
      // قلم ساخته‌شده از قالب همیشه مقطوع است (۴)
      pricingMode: 'lump_sum' as const,
      sharePct: row['sharePct'] === null || row['sharePct'] === undefined ? null : num(row['sharePct'], `${at}.sharePct`, 0, 100),
    };
  });
  const unique = (keys: readonly string[], label: string) => {
    if (new Set(keys).size !== keys.length) fail(`کلید تکراری در ${label}.`);
    return new Set(keys);
  };
  const wbsKeys = unique(
    wbs.map((row) => row.key),
    'WBS',
  );
  const cbsKeys = unique(
    cbs.map((row) => row.key),
    'CBS',
  );
  for (const row of wbs) if (row.parentKey && !wbsKeys.has(row.parentKey)) fail(`والد «${row.parentKey}» در WBS نیست.`);
  for (const row of cbs) if (row.parentKey && !cbsKeys.has(row.parentKey)) fail(`والد «${row.parentKey}» در CBS نیست.`);
  const parents = new Set(wbs.flatMap((row) => (row.parentKey ? [row.parentKey] : [])));
  const cbsParents = new Set(cbs.flatMap((row) => (row.parentKey ? [row.parentKey] : [])));
  const links = arr(raw['links'] ?? [], 'links').map((entry, index) => {
    const link = obj(entry, `links[${index}]`);
    const wbsKey = str(link['wbsKey'], `links[${index}].wbsKey`, 60);
    const cbsKey = str(link['cbsKey'], `links[${index}].cbsKey`, 60);
    if (!wbsKeys.has(wbsKey) || parents.has(wbsKey) || !cbsKeys.has(cbsKey) || cbsParents.has(cbsKey)) fail('اتصال فقط میان برگ WBS و برگ CBS است.');
    return { wbsKey, cbsKey, parts: int(link['parts'] ?? 1, `links[${index}].parts`, 1, 10_000) };
  });
  unique(
    links.map((link) => `${link.wbsKey}|${link.cbsKey}`),
    'اتصال‌ها',
  );
  const areas = arr(raw['areas'] ?? [], 'areas').map((entry, index) => {
    const area = obj(entry, `areas[${index}]`);
    const roots = arr(area['wbsRootKeys'] ?? [], `areas[${index}].wbsRootKeys`).map((key) => str(key, `areas[${index}].wbsRootKeys`, 60));
    if (roots.some((key) => !wbsKeys.has(key))) fail(`ریشهٔ حوزهٔ ${index + 1} در WBS نیست.`);
    return { key: str(area['key'], `areas[${index}].key`, 60), name: str(area['name'], `areas[${index}].name`, 120), wbsRootKeys: roots };
  });
  for (const row of wbs) if (row.areaKey && !areas.some((area) => area.key === row.areaKey)) fail(`حوزهٔ «${row.areaKey}» تعریف نشده است.`);
  // کد نمایشی خالی از ساختار ساخته می‌شود (۵.۲؛ wbs.md ۵.۲)
  const number = (parentKey: string | null, prefix: string) =>
    wbs
      .filter((row) => row.parentKey === parentKey)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((row, index) => {
        if (row.code.trim() === '') row.code = prefix ? `${prefix}.${index + 1}` : String(index + 1);
        number(row.key, row.code);
      });
  number(null, '');
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    referenceDurationWd: int(raw['referenceDurationWd'], 'referenceDurationWd', 1, 100_000),
    wbs,
    cbs,
    links,
    areas,
    settings: settingsOf(raw['settings']),
  };
}
