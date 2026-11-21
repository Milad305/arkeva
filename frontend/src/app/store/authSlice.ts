import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { EntityId } from '@/shared/types/api';
import type { GrantedPermission } from '@/config/permissions';
import type { SystemRole } from '@/config/constants';
import { readSession } from './authStorage';

export interface AuthUser {
  id: EntityId;
  fullName: string;
  initials: string;
  username: string;
  mobile: string;
  jobTitle: string;
  /** یکی از a1..a8 در kit.css — رنگ آواتار. */
  avatarTone: string;
}

export interface AuthOrganization {
  id: EntityId;
  name: string;
  initials: string;
  activeProjectCount: number;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  organizations: AuthOrganization[];
  currentOrganizationId: EntityId | null;
  /** مدیر سازمان همهٔ کدها را دارد و ماتریسش غیرقابل‌تغییر است (D11). */
  isOrgAdmin: boolean;
  /**
   * دسترسی‌های مؤثر کاربر در پروژهٔ جاری — اجتماع نقش‌هایش، با دامنهٔ وسیع‌تر.
   * تا آماده‌شدن API خالی می‌ماند.
   */
  effectivePermissions: GrantedPermission[];
  /** نقش‌های کاربر در پروژهٔ جاری؛ فقط برای نمایش، نه برای تصمیم دسترسی. */
  rolesInProject: SystemRole[];
  /** مرحلهٔ ورود دومرحله‌ای؛ بین ارسال نام کاربری و تأیید کد. */
  pendingOtpFor: string | null;
}

const storedSession = readSession();

const initialState: AuthState = {
  user: null,
  accessToken: storedSession?.accessToken ?? null,
  refreshToken: storedSession?.refreshToken ?? null,
  organizations: [],
  currentOrganizationId: null,
  isOrgAdmin: false,
  rolesInProject: [],
  effectivePermissions: [],
  pendingOtpFor: null,
};

export interface Credentials {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  organizations?: AuthOrganization[];
  effectivePermissions?: GrantedPermission[];
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<Credentials>) {
      const { user, accessToken, refreshToken, organizations, effectivePermissions } =
        action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken ?? null;
      state.pendingOtpFor = null;
      if (organizations) {
        state.organizations = organizations;
        state.currentOrganizationId ??= organizations[0]?.id ?? null;
      }
      if (effectivePermissions) state.effectivePermissions = effectivePermissions;
    },
    setPendingOtp(state, action: PayloadAction<string | null>) {
      state.pendingOtpFor = action.payload;
    },
    setCurrentOrganization(state, action: PayloadAction<EntityId>) {
      state.currentOrganizationId = action.payload;
    },
    setEffectivePermissions(state, action: PayloadAction<GrantedPermission[]>) {
      state.effectivePermissions = action.payload;
    },
    /** ویرایش پروفایل در W32 — نام و عنوان شغلی در پوسته فوری عوض می‌شود. */
    updateUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) Object.assign(state.user, action.payload);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.organizations = [];
      state.currentOrganizationId = null;
      state.effectivePermissions = [];
      state.rolesInProject = [];
      state.isOrgAdmin = false;
      state.pendingOtpFor = null;
    },
  },
});

export const {
  setCredentials,
  setPendingOtp,
  setCurrentOrganization,
  setEffectivePermissions,
  updateUser,
  logout,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
