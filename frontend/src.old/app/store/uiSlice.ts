import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// UI state سراسری — فقط حالت کلاینت (مطابق frontend-react.md بخش ۴)
// state سرور توسط RTK Query مدیریت می‌شود، نه اینجا.

export interface UiState {
  // سایدبار (در موبایل)
  sidebarOpen: boolean;

  // سازمان فعال (سوییچر سازمان — مطابق designs/Projects.html)
  currentOrganizationId: number | null;

  // پروژه فعال (برای context در صفحات پروژه)
  currentProjectId: number | null;

  // لودینگ سراسری (توسط middleware RTK مدیریت می‌شود)
  globalLoading: {
    isLoading: boolean;
    message: string | null;
  };

  // Quick Switcher (Ctrl+K) — مطابق designs/Modals.html
  quickSwitcherOpen: boolean;
}

const initialState: UiState = {
  sidebarOpen: false,
  currentOrganizationId: null,
  currentProjectId: null,
  globalLoading: { isLoading: false, message: null },
  quickSwitcherOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setCurrentOrganization(state, action: PayloadAction<number>) {
      state.currentOrganizationId = action.payload;
    },
    setCurrentProject(state, action: PayloadAction<number>) {
      state.currentProjectId = action.payload;
    },
    setGlobalLoading(
      state,
      action: PayloadAction<{ isLoading: boolean; message?: string | null }>,
    ) {
      state.globalLoading = {
        isLoading: action.payload.isLoading,
        message: action.payload.message ?? null,
      };
    },
    toggleQuickSwitcher(state) {
      state.quickSwitcherOpen = !state.quickSwitcherOpen;
    },
    setQuickSwitcherOpen(state, action: PayloadAction<boolean>) {
      state.quickSwitcherOpen = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setCurrentOrganization,
  setCurrentProject,
  setGlobalLoading,
  toggleQuickSwitcher,
  setQuickSwitcherOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
