import { AppButton } from '@/shared/components/ui/AppButton';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { toast } from '@/shared/components/feedback/toastStore';
import { bearingBetween, compassLabel, formatLatLng, neshanPointUrl } from '@/shared/utils/geo';
import { toFaDigits } from '@/shared/utils/num';
import type { FieldReportDto } from '../types';
import { GpsSketch } from './GpsSketch';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{label}</span>
      <span className="v t-13">{value}</span>
    </div>
  );
}

/**
 * «مشاهده روی نقشه» از منوی گزارش (بوم W45). تا وقتی سرویس نقشه انتخاب نشده
 * (`project-setup.md` ۱۴ مرحلهٔ ۷) نقشهٔ واقعی درون اپ نیست؛ این پنجره همان طرح شعاع W40
 * را بزرگ‌تر نشان می‌دهد و مختصات، دقت و فاصله را کنارش می‌گذارد. پیوند نشان را خود کاربر
 * باز می‌کند (تصمیم کاربر 1405/08/23).
 *
 * مختصات پشت مجوز تازه‌ای نیست: هر کس گزارش را می‌بیند آن را هم می‌بیند، مثل فاصله و
 * «داخل/خارج محدوده» که از قبل دیده می‌شد.
 */
export function ReportLocationDialog({ report, onClose }: { report: FieldReportDto; onClose: () => void }) {
  const point = report.gpsLat != null && report.gpsLng != null ? { lat: report.gpsLat, lng: report.gpsLng } : null;
  const site = report.siteLat != null && report.siteLng != null ? { lat: report.siteLat, lng: report.siteLng } : null;
  const outside = report.distanceFromSiteM != null && report.distanceFromSiteM > report.siteRadiusM;
  const bearing = report.gpsBearingDeg ?? (point && site ? bearingBetween(site, point) : null);

  const copy = (text: string, done: string) => {
    void navigator.clipboard?.writeText(text);
    toast.success(done);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="موقعیت ثبت گزارش"
      description={`${report.reportNo} · ${report.author.fullName}`}
      footer={
        <div className="row g8">
          <AppButton variant="ghost" onClick={onClose}>
            بستن
          </AppButton>
          {point && (
            <AppButton
              variant="outline"
              icon="copy"
              onClick={() => copy(formatLatLng(point), 'مختصات گزارش کپی شد.')}
            >
              کپی مختصات
            </AppButton>
          )}
          {point && (
            // پیوند بیرونی است، پس `<a>` ساده با کلاس‌های بوم، نه `LinkButton` مسیریاب
            <a className="btn btn-p" href={neshanPointUrl(point)} target="_blank" rel="noreferrer noopener">
              <Icon name="external-link" size={15} />
              باز کردن در نشان
            </a>
          )}
        </div>
      }
    >
      <div className="col g14">
        {point ? (
          <div className="row wrap g14 ai-st">
            <GpsSketch
              distanceM={report.distanceFromSiteM}
              radiusM={report.siteRadiusM}
              seed={report.id}
              bearingDeg={bearing}
              size={168}
              showNorth
            />
            <div className="col g6 grow" style={{ minWidth: 180 }}>
              <Badge tone={outside ? 'err' : 'ok'} icon="map-pin">
                {outside ? 'بیرون از محدودهٔ کارگاه' : 'داخل محدودهٔ پروژه'}
              </Badge>
              <span className="t-12 tx6 lh">
                {report.distanceFromSiteM != null
                  ? `${toFaDigits(report.distanceFromSiteM)} متر از مرکز کارگاه${bearing != null ? ` به سمت ${compassLabel(bearing)}` : ''}؛ شعاع مجاز ${toFaDigits(report.siteRadiusM)} متر.`
                  : 'فاصله تا مرکز کارگاه ثبت نشده است.'}
              </span>
            </div>
          </div>
        ) : (
          <Alert tone="inf" icon="map-pin">
            {report.source === 'web_manual'
              ? 'این گزارش در وب ثبت شده و مهر مکان ندارد. مهر مکان فقط از اپ سرپرست می‌آید.'
              : 'موقعیت کارگاه این پروژه تنظیم نشده، پس نقطهٔ گزارش روی نقشه معنا ندارد. در تنظیمات پروژه، بخش اطلاعات عمومی، مختصات کارگاه را بنویسید.'}
          </Alert>
        )}

        <div className="box grid c2 rsp" style={{ gap: 10, background: '#FFFFFF' }}>
          <Row
            label="مختصات گزارش"
            value={point ? <span className="mono" dir="ltr">{formatLatLng(point)}</span> : <span className="tx5">—</span>}
          />
          <Row
            label="دقت GPS"
            value={report.gpsAccuracyM != null ? `${toFaDigits(report.gpsAccuracyM)} متر` : <span className="tx5">—</span>}
          />
          <Row
            label="مرکز کارگاه"
            value={site ? <span className="mono" dir="ltr">{formatLatLng(site)}</span> : <span className="tx5">تنظیم نشده</span>}
          />
          <Row label="شعاع مجاز" value={`${toFaDigits(report.siteRadiusM)} متر`} />
        </div>

        <span className="t-12 tx5 lh">
          نقشهٔ واقعی با کاشی نقشه پس از انتخاب سرویس نقشه به همین پنجره اضافه می‌شود.
        </span>
      </div>
    </Modal>
  );
}
