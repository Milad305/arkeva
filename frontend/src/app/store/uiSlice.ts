import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// فقط وضعیت UI سمت کلاینت. دادهٔ سرور کار RTK Query است.

export interface UiState {
  /** شمارنده است نه boolean، تا چند mutation همزمان همدیگر را خاموش نکنند. */
  pendingCount: number;
  loadingMessage: string | null;
  commandPaletteOpen: boolean;
  notificationsOpen: boolean;
  /** پنل جزئیات در کارگاه‌های سه‌پنلی، در عرض کم، جمع می‌شود. */
  detailPanelOpen: boolean;
}

const initialState: UiState = {
  pendingCount: 0,
  loadingMessage: null,
  commandPaletteOpen: false,
  notificationsOpen: false,
  detailPanelOpen: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    startLoading(state, action: PayloadAction<string | undefined>) {
      state.pendingCount += 1;
      if (action.payload) state.loadingMessage = action.payload;
    },
    stopLoading(state) {
      state.pendingCount = Math.max(0, state.pendingCount - 1);
      if (state.pendingCount === 0) state.loadingMessage = null;
    },
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.commandPaletteOpen = action.payload;
    },
    toggleCommandPalette(state) {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },
    setNotificationsOpen(state, action: PayloadAction<boolean>) {
      state.notificationsOpen = action.payload;
    },
    setDetailPanelOpen(state, action: PayloadAction<boolean>) {
      state.detailPanelOpen = action.payload;
    },
  },
});

export const {
  startLoading,
  stopLoading,
  setCommandPaletteOpen,
  toggleCommandPalette,
  setNotificationsOpen,
  setDetailPanelOpen,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
