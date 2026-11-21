import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Guard } from '@/shared/components/rbac/Guard';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Card, CardFooter, CardHeader } from '@/shared/components/ui/Card';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import type { Tone } from '@/shared/types/tone';
import { toFaDigits } from '@/shared/utils/num';
import { downloadWbsTemplate } from '@/modules/wbs/services/wbsTemplate';

interface SetupStep {
  key: string;
  title: string;
  body: string;
  icon: IconName;
  tone: Tone;
  /** گام‌های ۳ و ۴ پروژه می‌خواهند؛ تا پروژهٔ اول ساخته نشده پیوند ندارند. */
  to?: string;
}

const STEPS: SetupStep[] = [
  {
    key: 'create',
    title: '۱. ساخت پروژه',
    body: 'نام، کارفرما، تاریخ‌ها و بودجه را ثبت کنید.',
    icon: 'folder-plus',
    tone: 'pri',
    to: ROUTES.newProject,
  },
  {
    key: 'structure',
    title: '۲. ورود ساختار WBS',
    body: 'فایل XML از MSP یا Excel را بارگذاری کنید یا از قالب آماده شروع کنید.',
    icon: 'git-branch',
    tone: 'inf',
    to: ROUTES.mspImport,
  },
  {
    key: 'invite',
    title: '۳. دعوت سرپرستان',
    body: 'با شمارهٔ موبایل دعوت کنید؛ لینک نصب اپ اندروید پیامک می‌شود.',
    icon: 'user-plus',
    tone: 'ok',
  },
  {
    key: 'assign',
    title: '۴. تخصیص فعالیت‌ها',
    body: 'هر بخش WBS را به سرپرست مسئولش بسپارید تا گزارش‌ها برسد.',
    icon: 'list-checks',
    tone: 'acc',
  },
];

/**
 * W09 — سازمانی که هنوز پروژه ندارد.
 *
 * F02 ۹: «گام‌ها از وضعیت واقعی پروژهٔ اول پر می‌شود». بدون هیچ پروژه‌ای همه صفرند.
 */
export function ProjectsOnboarding() {
  const done = 0;

  return (
    <div className="col" style={{ alignItems: 'center' }}>
      <section className="empty" style={{ paddingTop: 56, maxWidth: 640 }}>
        <span className="eic">
          <Icon name="folder-plus" size={30} />
        </span>
        <h1 className="h-t2">هنوز پروژه‌ای در این سازمان نیست</h1>
        <p>
          اولین پروژه را بسازید یا برنامهٔ زمان‌بندی خود را از Microsoft Project وارد کنید تا درخت
          WBS به‌طور خودکار ساخته شود.
        </p>
        <div className="row wrap jc g8" style={{ marginTop: 10 }}>
          <Guard permissions={['project.create']}>
            <LinkButton to={ROUTES.newProject} variant="primary" size="lg" icon="plus">
              پروژهٔ جدید
            </LinkButton>
          </Guard>
          <Guard permissions={['msp.import']}>
            <LinkButton
              to={ROUTES.mspImport}
              variant="outline"
              size="lg"
              icon="upload"
              style={{ fontWeight: 500 }}
            >
              ورود از MSP
            </LinkButton>
          </Guard>
          <AppButton
            variant="ghost"
            size="lg"
            icon="file-down"
            style={{ fontWeight: 500 }}
            onClick={downloadWbsTemplate}
          >
            دانلود قالب Excel
          </AppButton>
        </div>
      </section>

      <Card style={{ width: '100%', maxWidth: 980, marginTop: 16 }}>
        <CardHeader
          icon="list-checks"
          iconClassName="tx-pri"
          title="راه‌اندازی پروژه‌یار در چهار گام"
          action={
            <span className="row g8 t-12 tx6">
              {`${toFaDigits(done)} از ${toFaDigits(STEPS.length)} گام`}
              <ProgressBar
                value={Math.max(4, (done / STEPS.length) * 100)}
                size="thin"
                label="پیشرفت راه‌اندازی"
                style={{ width: 120, flex: '0 0 auto' }}
              />
            </span>
          }
        />

        <div className="grid c4" style={{ padding: 16, gap: 12 }}>
          {STEPS.map((step) => {
            const content = (
              <>
                <IconBox icon={step.icon} tone={step.tone} />
                <span className="t-13 fw6">{step.title}</span>
                <span className="t-12 tx6 lh">{step.body}</span>
                {!step.to && <span className="t-xs tx5">پس از ساخت پروژهٔ اول</span>}
              </>
            );

            return step.to ? (
              <Link key={step.key} to={step.to} className="box col g8" style={{ background: '#FFFFFF' }}>
                {content}
              </Link>
            ) : (
              <div key={step.key} className="box col g8" style={{ background: '#FFFFFF', opacity: 0.7 }}>
                {content}
              </div>
            );
          })}
        </div>

        <CardFooter>
          <span className="row g8 t-12 tx6">
            <Icon name="video" size={14} />
            ویدئوی آموزشی ۶ دقیقه‌ای راه‌اندازی
          </span>
          <Link className="link" to={ROUTES.help}>
            مرکز راهنما
            <Icon name="chevron-left" size={12} />
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
