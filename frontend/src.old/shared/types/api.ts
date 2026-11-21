// wrapper استاندارد پاسخ API (مطابق frontend-react.md بخش ۴ — همه APIها ApiResponse<T>)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

// ساختار خطای استاندارد از بک‌اند
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  statusCode: number;
}

// خطای نرم‌شده برای استفاده در catch
export class AppError extends Error {
  statusCode: number;
  fieldErrors?: Array<{ field: string; message: string }>;

  constructor(message: string, statusCode = 500, fieldErrors?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors as Array<{ field: string; message: string }> | undefined;
  }
}
