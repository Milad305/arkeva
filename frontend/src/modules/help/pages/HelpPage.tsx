import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { Chip } from '@/shared/components/ui/Chip';
import { Icon } from '@/shared/components/ui/Icon';
import { Kbd } from '@/shared/components/ui/Kbd';
import { Modal } from '@/shared/components/ui/Modal';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toFaDigits } from '@/shared/utils/num';
import { APP_VERSION, HELP_FAQ, HELP_GUIDES, HELP_POPULAR, HELP_SHORTCUTS, SUPPORT_CONTACT, type HelpGuide } from '../content';

const normalize = (value: string) => value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/**
 * W33 — راهنما و پشتیبانی (access-control.md ۷: فقط محتوای ثابت؛ تصمیم 1405/08/19).
 * جستجو در راهنماها و پرسش‌ها، راهنمای نقش‌ها، پرسش‌های پرتکرار، میان‌برها و تماس با پشتیبانی.
 * درخواست پشتیبانی، گفت‌وگو، وضعیت سرویس‌ها، پیشرفت آموزش و ویدئوهای بوم ساخته نشد.
 */
export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(HELP_FAQ[0]!.key);
  const [guide, setGuide] = useState<HelpGuide | null>(null);
  const term = normalize(search);
  const categories = useMemo(() => [...new Set(HELP_FAQ.map((entry) => entry.category))], []);

  const guides = HELP_GUIDES.filter((entry) => !term || normalize(`${entry.title} ${entry.summary} ${entry.steps.join(' ')}`).includes(term));
  const faq = HELP_FAQ.filter(
    (entry) => (!category || entry.category === category) && (!term || normalize(`${entry.question} ${entry.answer} ${entry.category}`).includes(term)),
  );

  return (
    <>
      <Topbar title="راهنما و پشتیبانی" icon="life-buoy" />
      <Content>
        <section className="card help-hero">
          <div className="col g12" style={{ padding: '28px 32px', maxWidth: 720 }}>
            <span className="eyebrow" style={{ color: '#F4B17C' }}>
              مرکز راهنمای پروژه‌یار
            </span>
            <h1 className="h-t1" style={{ color: '#FFFFFF', margin: 0 }}>
              چه کمکی لازم دارید؟
            </h1>
            <TextInput
              size="lg"
              icon="search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="مثلاً: ورود فایل MSP یا تأیید دومرحله‌ای"
              aria-label="جستجو در راهنما"
              style={{ maxWidth: 560, borderColor: 'transparent' }}
            />
            <div className="row g8 wrap">
              <span className="t-12" style={{ color: '#8AA2C2' }}>
                جستجوهای پرتکرار:
              </span>
              {HELP_POPULAR.map((entry) => (
                <button key={entry} type="button" className="chip help-chip" onClick={() => setSearch(entry)}>
                  {entry}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="help-grid">
          <div className="col g16" style={{ minWidth: 0 }}>
            <Card>
              <CardHeader title="راهنمای شروع بر اساس نقش" subtitle="مسیر کوتاه یادگیری برای هر نقش" />
              {guides.length === 0 ? (
                <div className="t-13 tx6" style={{ padding: '4px 16px 16px' }}>
                  راهنمایی با این عبارت نیست.
                </div>
              ) : (
                <div className="grid c3 rsp" style={{ gap: 10, padding: '14px 16px 16px' }}>
                  {guides.map((entry) => (
                    <button key={entry.key} type="button" className="box col g6 help-guide" onClick={() => setGuide(entry)}>
                      <span className="row g8">
                        <span className="icb sm" style={{ background: entry.tone.bg, color: entry.tone.fg }}>
                          <Icon name={entry.icon} size={15} />
                        </span>
                        <span className="t-13 fw6 tx9">{entry.title}</span>
                      </span>
                      <span className="t-12 tx6 lh">{entry.summary}</span>
                      <span className="row g6 t-xs tx5" style={{ marginTop: 2 }}>
                        <Icon name="clock" size={12} />
                        {`${toFaDigits(entry.minutes)} دقیقه`}
                        <span className="ms-auto">{`${toFaDigits(entry.steps.length)} گام`}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="پرسش‌های پرتکرار" subtitle={`${toFaDigits(HELP_FAQ.length)} پرسش در ${toFaDigits(categories.length)} دسته`} />
              <div className="row wrap g6" style={{ padding: '0 16px 12px' }}>
                <Chip selected={category === null} onClick={() => setCategory(null)}>
                  همه
                </Chip>
                {categories.map((entry) => (
                  <Chip key={entry} selected={category === entry} onClick={() => setCategory(category === entry ? null : entry)}>
                    {entry}
                  </Chip>
                ))}
              </div>
              {faq.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="پرسشی با این عبارت پیدا نشد"
                  description="عبارت کوتاه‌تری امتحان کنید یا با پشتیبانی تماس بگیرید."
                  actions={
                    <AppButton
                      size="sm"
                      variant="outline"
                      icon="x"
                      onClick={() => {
                        setSearch('');
                        setCategory(null);
                      }}
                    >
                      پاک کردن جستجو
                    </AppButton>
                  }
                />
              ) : (
                <div className="col">
                  {faq.map((entry) => {
                    const expanded = open === entry.key;
                    const panelId = `faq-${entry.key}`;
                    return (
                      <div key={entry.key} style={{ borderTop: '1px solid #F4F4F5' }}>
                        <button type="button" className="row g10 help-q" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : entry.key)}>
                          <span className="tx5" style={{ display: 'inline-flex' }}>
                            <Icon name={entry.icon} size={16} />
                          </span>
                          <span className="t-13 fw5 tx9 grow">{entry.question}</span>
                          <Badge size="sm" tone="neu">
                            {entry.category}
                          </Badge>
                          <Icon name="chevron-down" size={15} className={expanded ? 'help-rot' : undefined} />
                        </button>
                        {expanded && (
                          <div id={panelId} className="t-13 tx7 help-a">
                            {entry.answer}
                            {entry.link && (
                              <>
                                {' '}
                                <Link className="link" to={entry.link.to}>
                                  {entry.link.label}
                                </Link>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="col g16" style={{ minWidth: 0 }}>
            <Card>
              <CardHeader title="پشتیبانی" subtitle={SUPPORT_CONTACT.hours} />
              <div className="col g10" style={{ padding: '4px 16px 16px' }}>
                <a className="btn btn-p btn-blk" href={`mailto:${SUPPORT_CONTACT.email}`}>
                  <Icon name="mail" size={16} />
                  ایمیل به پشتیبانی
                </a>
                <span className="row g8 t-13 tx8">
                  <Icon name="phone" size={14} />
                  تلفن:
                  <a className="link mono" dir="ltr" href={`tel:${SUPPORT_CONTACT.phone}`}>
                    {SUPPORT_CONTACT.phone}
                  </a>
                </span>
                <span className="row g8 t-13 tx8">
                  <Icon name="at-sign" size={14} />
                  <span className="mono" dir="ltr">
                    {SUPPORT_CONTACT.email}
                  </span>
                </span>
                <span className="hint">برای مشکل دسترسی یا قفل حساب، اول با مدیر سازمان خود تماس بگیرید.</span>
              </div>
            </Card>

            <Card>
              <CardHeader title="میان‌برهای صفحه‌کلید" />
              <div className="col" style={{ padding: '0 16px 10px' }}>
                {HELP_SHORTCUTS.map((entry) => (
                  <div key={entry.title} className="row g10" style={{ padding: '7px 0' }}>
                    <span className="t-13 tx8 grow">{entry.title}</span>
                    <span className="row g4" dir="ltr">
                      {entry.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="row g10 t-xs tx5" style={{ padding: '0 4px' }}>
              <Icon name="info" size={14} />
              <span className="grow">{`پروژه‌یار وب ${toFaDigits(APP_VERSION.web)} · اندروید ${toFaDigits(APP_VERSION.android)}`}</span>
            </div>
          </div>
        </div>
      </Content>

      {guide && (
        <Modal
          isOpen
          onClose={() => setGuide(null)}
          title={`راهنمای ${guide.title}`}
          description={guide.summary}
          footer={
            <>
              <AppButton variant="ghost" onClick={() => setGuide(null)}>
                بستن
              </AppButton>
              {guide.link && (
                <LinkButton variant="primary" icon="arrow-left" to={guide.link.to}>
                  {guide.link.label}
                </LinkButton>
              )}
            </>
          }
        >
          <ol className="col g10" style={{ margin: 0, paddingInlineStart: 20 }}>
            {guide.steps.map((step) => (
              <li key={step} className="t-13 tx8" style={{ lineHeight: 1.9 }}>
                {step}
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </>
  );
}
