import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

// RootState و AppDispatch از store/index می‌آیند (آنجا تعریف شده‌اند).
// این فایل circular import ایجاد نمی‌کند چون store/index از این فایل ایمپورت نمی‌کند.
import type { RootState, AppDispatch } from './state-types';

// hookهای تایپ‌شده (مطابق frontend-react.md بخش ۴ — ممنوع useDispatch/useSelector خام)
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
