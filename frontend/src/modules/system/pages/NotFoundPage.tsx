import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { useAppDispatch } from '@/app/store/hooks';
import { setCommandPaletteOpen } from '@/app/store/uiSlice';

/** صفحه پیدا نشد (۴۰۴) — مطابق W46. */
export function NotFoundPage() {
  const dispatch = useAppDispatch();

  return (
    <Content>
      <EmptyState
        inCard
        icon="compass"
        title="این صفحه پیدا نشد"
        description="ممکن است نشانی تغییر کرده یا پروژه بایگانی شده باشد."
        actions={
          <>
            <LinkButton variant="primary" size="sm" to={ROUTES.dashboard}>
              رفتن به داشبورد
            </LinkButton>
            <AppButton
              variant="outline"
              size="sm"
              icon="search"
              onClick={() => dispatch(setCommandPaletteOpen(true))}
            >
              جستجو
            </AppButton>
          </>
        }
      />
    </Content>
  );
}
