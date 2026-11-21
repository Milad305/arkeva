import type { FetchArgs, FetchBaseQueryError, QueryReturnValue } from '@reduxjs/toolkit/query';

/**
 * queryFn یک endpoint سرور (برش ۲۰: ماک‌ها کنار رفتند). `real` نشانی و بدنه را می‌سازد؛ پوشش `ApiResponse<T>` سرور اینجا باز
 * می‌شود تا کامپوننت‌ها خودِ داده را ببینند. `fromServer` وقتی یک مسیر سرور دو endpoint را می‌دهد (مثل حوزه‌های تأیید).
 *
 * ```ts
 * getWbsTree: build.query<WbsItemDto[], { projectId: EntityId }>({
 *   queryFn: serverQuery(({ projectId }) => ENDPOINTS.WBS_TREE(projectId)),
 *   providesTags: (_r, _e, { projectId }) => [{ type: 'WbsItem', id: projectId }],
 * }),
 * ```
 */

type RtkQueryFn<Result, Arg> = (
  arg: Arg,
  api: unknown,
  extraOptions: unknown,
  baseQuery: (
    arg: string | FetchArgs,
  ) =>
    | PromiseLike<QueryReturnValue<unknown, FetchBaseQueryError, unknown>>
    | QueryReturnValue<unknown, FetchBaseQueryError, unknown>,
) => Promise<QueryReturnValue<Result, FetchBaseQueryError, undefined>>;

export function serverQuery<Result, Arg = void>(
  real: (arg: Arg) => string | FetchArgs,
  options?: { fromServer?: (data: unknown) => Result },
): RtkQueryFn<Result, Arg> {
  return async (arg, _api, _extraOptions, baseQuery) => {
    const result = await baseQuery(real(arg));
    if (result.error) return { error: result.error };
    const data = unwrap<unknown>(result.data);
    return { data: options?.fromServer ? options.fromServer(data) : (data as Result) };
  };
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload && 'success' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
