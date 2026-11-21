import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { QrCode } from '@/shared/components/ui/QrCode';
import { groupInviteCode, inviteQrValue } from '../services/inviteQr';

export interface InviteQrDialogProps {
  /** کد ۸ نویسه‌ای دعوت که سرور فقط در پاسخ دعوت یا «ارسال دوباره» یک بار می‌دهد. */
  code: string;
  name?: string | null;
  onClose: () => void;
}

/**
 * QR دعوت (OD-20): مدیر پروژه در کارگاه آن را به سرپرست نشان می‌دهد تا در اپ «ورود با کد یا QR دعوت» را اسکن کند.
 * کد فقط هش در سرور است و دوباره نمایش داده نمی‌شود؛ برای کد تازه «ارسال دوباره» دعوت.
 */
export function InviteQrDialog({ code, name, onClose }: InviteQrDialogProps) {
  const grouped = groupInviteCode(code);
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="QR دعوت اپ کارگاه"
      description={name ? `برای ${name}` : undefined}
      footer={
        <AppButton variant="primary" onClick={onClose}>
          بستن
        </AppButton>
      }
    >
      <div className="col g14" style={{ alignItems: 'center' }}>
        <QrCode value={inviteQrValue(code)} size={220} label={`QR دعوت با کد ${code}`} />
        <div className="mono" style={{ fontSize: 22, letterSpacing: 4 }} aria-label="کد دعوت">
          {grouped}
        </div>
        <p className="hint" style={{ margin: 0, textAlign: 'center' }}>
          در اپ کارگاه «ورود با کد یا QR دعوت» را بزنید و این QR را اسکن کنید، یا کد را بنویسید. همین کد پیامک هم شد.
        </p>
        <Alert tone="inf" icon="info">
          این کد فقط همین بار نمایش داده می‌شود. اگر بعداً لازم شد، دعوت را «ارسال دوباره» کنید تا کد تازه ساخته شود.
        </Alert>
      </div>
    </Modal>
  );
}
