import { baseApi } from '@/app/api/baseApi';
import { registerApiBehavior } from '@/app/api/behavior';
import { serverQuery } from '@/app/api/serverQuery';
import { ENDPOINTS } from '@/config/endpoints';
import type { WeightGenerator } from '@/config/constants';
import type { EntityId } from '@/shared/types/api';
import type {
  ApplySyncResultDto,
  BuildImportRequest,
  BuildImportResultDto,
  ConflictResolution,
  ExportPreviewDto,
  ExportRequest,
  ExportResultDto,
  ImportPreviewDto,
  ImportSessionDto,
  MappingOptionsDto,
  ResourceRowDto,
  SyncSessionDto,
} from '../types';

// F15 — ورود و همگام‌سازی MSP (W34، W35، W49، W36). کد دسترسی هر endpoint:
//   createImport, getImport, updateImport, getImportPreview, buildImport,
//   rollbackImport, getMappingOptions                              msp.import
//   createSync, getSync, updateSyncChange, selectAllChanges, applySync   msp.sync
//   getExportPreview, exportProgress                               msp.export

/** ورود و همگام‌سازی ساختار و برنامه را عوض می‌کنند. */
const PLAN_TAGS = [
  'WbsItem',
  'PlanVersion',
  'CbsItem',
  'Link',
  'Project',
  'MspSession',
  'Chart',
] as const;

export const mspApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createImport: build.mutation<ImportSessionDto, { projectId: EntityId; file: File }>({
      queryFn: serverQuery(({ projectId, file }) => {
        const body = new FormData();
        body.append('file', file);
        return { url: ENDPOINTS.MSP_IMPORTS(projectId), method: 'POST', body };
      }),
      invalidatesTags: (_result, error) => (error ? [] : ['MspSession']),
    }),
    getImport: build.query<ImportSessionDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.MSP_IMPORT(id)),
      providesTags: ['MspSession'],
    }),
    getMappingOptions: build.query<MappingOptionsDto, EntityId | null>({
      queryFn: serverQuery((projectId) => ({
        url: ENDPOINTS.MSP_MAPPING_OPTIONS,
        params: { projectId: projectId ?? undefined },
      })),
      providesTags: ['MspSession', 'User'],
    }),
    updateImport: build.mutation<
      ImportSessionDto,
      {
        sessionId: EntityId;
        checkResolution?: { checkId: string; resolution: string };
        options?: { buildCbs?: boolean; importBaseline?: boolean; importProgress?: boolean };
        mapping?: { rowId: string; target: string };
        resource?: { rowId: string; userId: EntityId | null; action: ResourceRowDto['action'] };
        weightGenerator?: WeightGenerator;
        saveTemplate?: boolean;
      }
    >({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.MSP_IMPORT_MAPPING(request.sessionId),
        method: 'PUT',
        body: request,
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['MspSession']),
    }),
    getImportPreview: build.query<ImportPreviewDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.MSP_IMPORT_PREVIEW(id)),
      providesTags: ['MspSession'],
    }),
    buildImport: build.mutation<BuildImportResultDto, BuildImportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.MSP_IMPORT_BUILD(request.sessionId),
        method: 'POST',
        body: request,
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...PLAN_TAGS]),
    }),
    rollbackImport: build.mutation<ImportSessionDto, EntityId>({
      queryFn: serverQuery((id) => ({ url: ENDPOINTS.MSP_IMPORT_ROLLBACK(id), method: 'POST' })),
      invalidatesTags: (_result, error) => (error ? [] : [...PLAN_TAGS]),
    }),

    createSync: build.mutation<SyncSessionDto, { projectId: EntityId; file: File }>({
      queryFn: serverQuery(({ projectId, file }) => {
        const body = new FormData();
        body.append('file', file);
        return { url: ENDPOINTS.MSP_SYNCS(projectId), method: 'POST', body };
      }),
      invalidatesTags: (_result, error) => (error ? [] : ['MspSession']),
    }),
    getSync: build.query<SyncSessionDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.MSP_SYNC_CHANGES(id)),
      providesTags: ['MspSession'],
    }),
    updateSyncChange: build.mutation<
      SyncSessionDto,
      { sessionId: EntityId; changeId: string; selected?: boolean; resolution?: ConflictResolution }
    >({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.MSP_SYNC_CHANGE(request.sessionId, request.changeId),
        method: 'PATCH',
        body: request,
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['MspSession']),
    }),
    selectAllChanges: build.mutation<SyncSessionDto, { sessionId: EntityId; selected: boolean }>({
      queryFn: serverQuery(({ sessionId, selected }) => ({
        url: ENDPOINTS.MSP_SYNC_CHANGES(sessionId),
        method: 'PATCH',
        body: { selected },
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['MspSession']),
    }),
    applySync: build.mutation<ApplySyncResultDto, { sessionId: EntityId; reweight: boolean }>({
      queryFn: serverQuery(({ sessionId, reweight }) => ({
        url: ENDPOINTS.MSP_SYNC_APPLY(sessionId),
        method: 'POST',
        body: { reweight },
      })),
      invalidatesTags: (_result, error) => (error ? [] : [...PLAN_TAGS]),
    }),

    getExportPreview: build.query<ExportPreviewDto, EntityId>({
      queryFn: serverQuery((id) => ENDPOINTS.MSP_EXPORT_PREVIEW(id)),
      providesTags: ['MspSession', 'WbsItem'],
    }),
    exportProgress: build.mutation<ExportResultDto, ExportRequest>({
      queryFn: serverQuery((request) => ({
        url: ENDPOINTS.MSP_EXPORT(request.projectId),
        method: 'POST',
        body: request,
      })),
      invalidatesTags: (_result, error) => (error ? [] : ['MspSession']),
    }),
  }),
});

export const {
  useCreateImportMutation,
  useGetImportQuery,
  useGetMappingOptionsQuery,
  useUpdateImportMutation,
  useGetImportPreviewQuery,
  useBuildImportMutation,
  useRollbackImportMutation,
  useCreateSyncMutation,
  useGetSyncQuery,
  useUpdateSyncChangeMutation,
  useSelectAllChangesMutation,
  useApplySyncMutation,
  useGetExportPreviewQuery,
  useExportProgressMutation,
} = mspApi;

registerApiBehavior({
  getImport: { showErrorToast: false },
  getImportPreview: { showErrorToast: false },
  getMappingOptions: { showErrorToast: false },
  getSync: { showErrorToast: false },
  getExportPreview: { showErrorToast: false },
  createImport: { showErrorToast: false },
  createSync: { showErrorToast: false },
  updateImport: { showErrorToast: false },
  rollbackImport: {
    showSuccessToast: true,
    successMessage: 'ساختار برگردانده شد؛ پروژه دوباره بدون WBS است.',
  },
});
