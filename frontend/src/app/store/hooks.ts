import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './index';

/**
 * تنها راه دسترسی به store.
 * هیچ‌جا `useDispatch`/`useSelector` خام import نشود (قاعدهٔ frontend-react.md بخش ۴).
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
