import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// state کاربر احراز‌هویت‌شده.
// نکته: snapshot دسترسی‌های این کاربر در پروژه در project_members سمت سرور است.
// اینجا فقط اطلاعات پایه + سازمان فعلی را نگه می‌داریم.

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  mobile: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isDemo: boolean; // حالت نمایشی (تا بک‌اند آماده شود)
  // سازمان‌هایی که کاربر عضو است (برای سوییچر سازمان)
  organizations: Array<{ id: number; name: string; role: string }>;
}

const initialState: AuthState = (() => {
  // بازیابی state از localStorage برای ماندگاری بین refresh.
  // نکته: در production، این فقط تا زمان انقضای توکن معتبر است و بک‌اند آن را validate می‌کند.
  try {
    const persisted = localStorage.getItem('auth_state');
    if (persisted) {
      const parsed = JSON.parse(persisted) as AuthState;
      if (parsed.accessToken) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return {
    user: null,
    accessToken: null,
    isDemo: false,
    organizations: [],
  };
})();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isDemo = false;
    },
    setOrganizations(
      state,
      action: PayloadAction<Array<{ id: number; name: string; role: string }>>,
    ) {
      state.organizations = action.payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isDemo = false;
      state.organizations = [];
    },
  },
});

export const { setCredentials, setOrganizations, logout } = authSlice.actions;
export default authSlice.reducer;

