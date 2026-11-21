// RTK Query endpointهای WBS — ساختار واقعی، فعلاً mock (مطابق frontend-react.md بخش ۱۲.۳).
// وقتی بک‌اند آماده شد، فقط baseQuery به URL واقعی وصل می‌شود، نه بازنویسی.

import { baseApi } from '@/app/api/baseApi';
import { ENDPOINTS } from '@/config/endpoints';
import type {
  WbsTreeNode,
  WbsTreeSummary,
  WbsNodeDto,
  WbsFilters,
  CreateWbsNodeDto,
  UpdateWbsNodeDto,
  ReorderWbsNodeDto,
  WbsImportDto,
  WbsImportValidation,
  WbsExportDto,
} from '../types';
import {
  mockGetWbsTree,
  mockGetWbsSummary,
  mockCanDelete,
  mockValidateImport,
  mockCreateNode,
  mockUpdateNode,
  mockDeleteNode,
} from '../mocks/wbsTree';

// ────────── اعمال فیلتر روی درخت ──────────
function applyFilters(tree: WbsTreeNode[], filters: WbsFilters): WbsTreeNode[] {
  if (
    filters.search === '' &&
    filters.status === 'all' &&
    filters.ownerId === 'all' &&
    filters.nodeType === 'all'
  ) {
    return tree;
  }

  // ابتدا flatten + فیلتر، بعد rebuild درخت
  // برای سادگی: clone درخت، سپس filter
  const filtered = structuredClone(tree) as WbsTreeNode[];

  function matches(node: WbsTreeNode): boolean {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!node.title.toLowerCase().includes(q) && !node.code.toLowerCase().includes(q)) {
        // اگه خودش match نیست ولی یکی از فرزندانش match هست، نگه دار
        if (!hasMatchingDescendant(node, q)) return false;
      } else {
        return true;
      }
    }
    if (filters.nodeType === 'leaves' && !node.isLeaf) {
      if (!hasMatchingLeafDescendant(node)) return false;
    }
    if (filters.nodeType === 'parents' && node.isLeaf) return false;
    if (filters.status !== 'all') {
      const actual = node.actualProgress;
      const planned = node.plannedProgress;
      const status =
        actual >= 100 ? 'done' : actual === 0 ? 'pending' : (() => {
          const diff = actual - planned;
          return diff >= -5 ? 'progress' : diff >= -15 ? 'warn' : 'late';
        })();
      if (status !== filters.status) {
        if (!hasMatchingStatusDescendant(node, filters.status)) return false;
      }
    }
    if (filters.ownerId !== 'all') {
      if (node.isLeaf && node.ownerId !== filters.ownerId) return false;
      if (!node.isLeaf && !hasMatchingOwnerDescendant(node, filters.ownerId as number)) return false;
    }
    return true;
  }

  function hasMatchingDescendant(node: WbsTreeNode, q: string): boolean {
    for (const c of node.children) {
      if (c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) return true;
      if (hasMatchingDescendant(c, q)) return true;
    }
    return false;
  }
  function hasMatchingLeafDescendant(node: WbsTreeNode): boolean {
    for (const c of node.children) {
      if (c.isLeaf) return true;
      if (hasMatchingLeafDescendant(c)) return true;
    }
    return false;
  }
  function hasMatchingStatusDescendant(node: WbsTreeNode, status: string): boolean {
    for (const c of node.children) {
      const actual = c.actualProgress;
      const planned = c.plannedProgress;
      const s =
        actual >= 100 ? 'done' : actual === 0 ? 'pending' : (() => {
          const diff = actual - planned;
          return diff >= -5 ? 'progress' : diff >= -15 ? 'warn' : 'late';
        })();
      if (s === status) return true;
      if (hasMatchingStatusDescendant(c, status)) return true;
    }
    return false;
  }
  function hasMatchingOwnerDescendant(node: WbsTreeNode, ownerId: number): boolean {
    for (const c of node.children) {
      if (c.isLeaf && c.ownerId === ownerId) return true;
      if (!c.isLeaf && hasMatchingOwnerDescendant(c, ownerId)) return true;
    }
    return false;
  }

  function prune(nodes: WbsTreeNode[]): WbsTreeNode[] {
    const out: WbsTreeNode[] = [];
    for (const n of nodes) {
      if (matches(n)) {
        const clone = { ...n, children: prune(n.children) };
        out.push(clone);
      }
    }
    return out;
  }

  return prune(filtered);
}

export const wbsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ─── Queries ───

    // درخت کامل WBS یک پروژه
    getWbsTree: builder.query<WbsTreeNode[], { projectId: number; filters?: WbsFilters }>({
      query: ({ projectId }) => ({
        url: ENDPOINTS.WBS_TREE(projectId),
        method: 'GET',
      }),
      transformResponse: (_r, _m, { projectId, filters }) => {
        const tree = mockGetWbsTree(projectId);
        return filters ? applyFilters(tree, filters) : tree;
      },
      providesTags: (_r, _e, { projectId }) => [
        { type: 'WbsItem', id: `TREE-${projectId}` },
      ],
    }),

    // خلاصه ساختار
    getWbsSummary: builder.query<WbsTreeSummary, number>({
      query: (projectId) => ({
        url: `${ENDPOINTS.WBS_TREE(projectId)}/summary`,
        method: 'GET',
      }),
      transformResponse: (_r, _m, projectId) => {
        return mockGetWbsSummary(mockGetWbsTree(projectId));
      },
      providesTags: (_r, _e, projectId) => [
        { type: 'WbsItem', id: `SUMMARY-${projectId}` },
      ],
    }),

    // یک گره خاص با جزئیات کامل
    getWbsNode: builder.query<WbsNodeDto, { projectId: number; nodeId: number }>({
      query: ({ projectId, nodeId }) => ({
        url: ENDPOINTS.WBS_ITEM(projectId, nodeId),
        method: 'GET',
      }),
      transformResponse: (_r, _m, { projectId, nodeId }) => {
        const tree = mockGetWbsTree(projectId);
        const node = findInTree(tree, nodeId);
        if (!node) throw new Error('آیتم WBS یافت نشد');
        return node as WbsNodeDto;
      },
      providesTags: (_r, _e, { nodeId }) => [{ type: 'WbsItem', id: nodeId }],
    }),

    // اعتبارسنجی پیش از حذف (قاعده ۵.۶ AGENTS)
    checkWbsDelete: builder.query<{ canDelete: boolean; reason: string | null; counts: { children: number; reports: number; cbsLinks: number } }, { projectId: number; nodeId: number }>({
      query: ({ projectId, nodeId }) => ({
        url: `${ENDPOINTS.WBS_ITEM(projectId, nodeId)}/can-delete`,
        method: 'GET',
      }),
      transformResponse: (_r, _m, { projectId, nodeId }) => {
        const tree = mockGetWbsTree(projectId);
        const node = findInTree(tree, nodeId);
        if (!node) throw new Error('آیتم یافت نشد');
        return mockCanDelete(node);
      },
      providesTags: (_r, _e, { nodeId }) => [{ type: 'WbsItem', id: `DEL-CHECK-${nodeId}` }],
    }),

    // اعتبارسنجی import
    validateWbsImport: builder.query<WbsImportValidation, { fileName: string }>({
      query: ({ fileName }) => ({
        url: `${ENDPOINTS.WBS_IMPORT(0)}/validate`,
        method: 'POST',
        body: { fileName },
      }),
      transformResponse: (_r, _m, { fileName }) => mockValidateImport(fileName),
      providesTags: [],
    }),

    // ─── Mutations ───

    // ساخت گره جدید
    createWbsNode: builder.mutation<WbsNodeDto, CreateWbsNodeDto>({
      query: (body) => ({
        url: ENDPOINTS.WBS_TREE(body.projectId),
        method: 'POST',
        body,
      }),
      // mock: کافی است response موفق باشد. cache invalidation درخت را به‌روزرسانی می‌کند.
      transformResponse: (_r, _m, arg) => {
        const tree = mockGetWbsTree(arg.projectId);
        return mockCreateNode(arg, tree);
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: 'WbsItem', id: `TREE-${arg.projectId}` },
        { type: 'WbsItem', id: `SUMMARY-${arg.projectId}` },
      ],
      extraOptions: {
        showGlobalLoading: true,
        loadingMessage: 'در حال افزودن آیتم...',
        showSuccessToast: true,
        successMessage: 'آیتم WBS اضافه شد',
      } as never,
    }),

    // ویرایش گره
    updateWbsNode: builder.mutation<WbsNodeDto, { projectId: number; nodeId: number; patch: UpdateWbsNodeDto }>({
      query: ({ projectId, nodeId, patch }) => ({
        url: ENDPOINTS.WBS_ITEM(projectId, nodeId),
        method: 'PATCH',
        body: patch,
      }),
      transformResponse: (_r, _m, { projectId, nodeId, patch }) => {
        const tree = mockGetWbsTree(projectId);
        return mockUpdateNode(nodeId, patch, tree) as WbsNodeDto;
      },
      invalidatesTags: (_r, _e, { projectId, nodeId }) => [
        { type: 'WbsItem', id: `TREE-${projectId}` },
        { type: 'WbsItem', id: `SUMMARY-${projectId}` },
        { type: 'WbsItem', id: nodeId },
      ],
      extraOptions: {
        showGlobalLoading: true,
        loadingMessage: 'در حال ذخیره...',
        showSuccessToast: true,
        successMessage: 'تغییرات ذخیره شد',
      } as never,
    }),

    // حذف گره — با اعتبارسنجی ارجاعی
    deleteWbsNode: builder.mutation<{ success: boolean }, { projectId: number; nodeId: number }>({
      query: ({ projectId, nodeId }) => ({
        url: ENDPOINTS.WBS_ITEM(projectId, nodeId),
        method: 'DELETE',
      }),
      transformResponse: (_r, _e, { projectId, nodeId }) => {
        const tree = mockGetWbsTree(projectId);
        const node = findInTree(tree, nodeId);
        if (!node) throw new Error('آیتم یافت نشد');
        const check = mockCanDelete(node);
        if (!check.canDelete) {
          throw new Error(check.reason ?? 'امکان حذف وجود ندارد');
        }
        return { success: mockDeleteNode(nodeId, tree) };
      },
      invalidatesTags: (_r, _e, { projectId, nodeId }) => [
        { type: 'WbsItem', id: `TREE-${projectId}` },
        { type: 'WbsItem', id: `SUMMARY-${projectId}` },
        { type: 'WbsItem', id: nodeId },
      ],
      extraOptions: {
        showGlobalLoading: true,
        loadingMessage: 'در حال حذف...',
        showSuccessToast: true,
        successMessage: 'آیتم حذف شد',
        showErrorToast: true,
      } as never,
    }),

    // جابه‌جایی (drag-drop)
    reorderWbsNode: builder.mutation<{ success: boolean }, ReorderWbsNodeDto>({
      query: (body) => ({
        url: `${ENDPOINTS.WBS_ITEM(body.projectId, body.nodeId)}/reorder`,
        method: 'POST',
        body,
      }),
      transformResponse: () => ({ success: true }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'WbsItem', id: `TREE-${arg.projectId}` },
        { type: 'WbsItem', id: `SUMMARY-${arg.projectId}` },
      ],
      extraOptions: {
        showSuccessToast: true,
        successMessage: 'آیتم جابه‌جا شد',
      } as never,
    }),

    // import از فایل MSP/Excel
    importWbs: builder.mutation<{ validation: WbsImportValidation; imported: number }, WbsImportDto>({
      query: (body) => ({
        url: ENDPOINTS.WBS_IMPORT(body.projectId),
        method: 'POST',
        body,
      }),
      transformResponse: (_r, _m, arg) => {
        const validation = mockValidateImport(arg.fileName);
        return { validation, imported: validation.totalDetected };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: 'WbsItem', id: `TREE-${arg.projectId}` },
        { type: 'WbsItem', id: `SUMMARY-${arg.projectId}` },
      ],
      extraOptions: {
        showGlobalLoading: true,
        loadingMessage: 'در حال پردازش فایل...',
        showSuccessToast: true,
        successMessage: 'ساختار WBS بارگذاری شد',
      } as never,
    }),

    // خروجی به MSP/Excel
    exportWbs: builder.mutation<{ downloadUrl: string }, WbsExportDto>({
      query: (body) => ({
        url: ENDPOINTS.WBS_EXPORT(body.projectId),
        method: 'POST',
        body,
      }),
      transformResponse: (_r, _m, arg) => ({
        downloadUrl: `mock://wbs-export-${arg.projectId}.${arg.format}`,
      }),
      extraOptions: {
        showSuccessToast: true,
        successMessage: 'فایل خروجی آماده دانلود است',
      } as never,
    }),
  }),
});

// helper برای جستجو در درخت (mock-side)
function findInTree(tree: WbsTreeNode[], id: number): WbsTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children.length > 0) {
      const f = findInTree(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

export const {
  useGetWbsTreeQuery,
  useGetWbsSummaryQuery,
  useGetWbsNodeQuery,
  useCheckWbsDeleteQuery,
  useValidateWbsImportQuery,
  useCreateWbsNodeMutation,
  useUpdateWbsNodeMutation,
  useDeleteWbsNodeMutation,
  useReorderWbsNodeMutation,
  useImportWbsMutation,
  useExportWbsMutation,
} = wbsApi;
