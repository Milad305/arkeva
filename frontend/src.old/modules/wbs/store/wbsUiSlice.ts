// State کلاینت WBS — selection، expand/collapse، edit mode، filters.
// مطابق frontend-react.md بخش ۴: state کلاینت با createSlice، نه state سرور.

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_WBS_FILTERS, type WbsFilters } from '../types';

export interface WbsUiState {
  // id گره انتخاب‌شده در detail panel (null = حالت خالی)
  selectedNodeId: number | null;
  // نقشه expand: id → expanded. id نبود = پیش‌فرض (true برای parent‌ها)
  expandedIds: Record<number, boolean>;
  // حالت ویرایش (toggle از toolbar)
  editMode: boolean;
  // فیلترها (toolbar)
  filters: WbsFilters;
}

const initialState: WbsUiState = {
  selectedNodeId: null,
  expandedIds: {},
  editMode: false,
  filters: DEFAULT_WBS_FILTERS,
};

const wbsUiSlice = createSlice({
  name: 'wbsUi',
  initialState,
  reducers: {
    selectNode(state, action: PayloadAction<number | null>) {
      state.selectedNodeId = action.payload;
    },

    toggleExpand(state, action: PayloadAction<number>) {
      const id = action.payload;
      const current = id in state.expandedIds ? state.expandedIds[id]! : true;
      state.expandedIds[id] = !current;
    },

    setExpanded(state, action: PayloadAction<{ id: number; expanded: boolean }>) {
      state.expandedIds[action.payload.id] = action.payload.expanded;
    },

    // expand همه parent‌ها
    expandAll(state, action: PayloadAction<number[]>) {
      for (const id of action.payload) {
        state.expandedIds[id] = true;
      }
    },

    // collapse همه parent‌ها
    collapseAll(state, action: PayloadAction<number[]>) {
      for (const id of action.payload) {
        state.expandedIds[id] = false;
      }
    },

    // ست کردن کل نقشه (مثلاً از getDefaultExpandedIds)
    setExpandedMap(state, action: PayloadAction<Record<number, boolean>>) {
      state.expandedIds = action.payload;
    },

    setEditMode(state, action: PayloadAction<boolean>) {
      state.editMode = action.payload;
    },

    setFilters(state, action: PayloadAction<Partial<WbsFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters(state) {
      state.filters = DEFAULT_WBS_FILTERS;
    },

    // reset کامل state (هنگام تغییر projectId)
    resetWbsUi() {
      return initialState;
    },
  },
});

export const {
  selectNode,
  toggleExpand,
  setExpanded,
  expandAll,
  collapseAll,
  setExpandedMap,
  setEditMode,
  setFilters,
  resetFilters,
  resetWbsUi,
} = wbsUiSlice.actions;

export default wbsUiSlice.reducer;
