/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** زیرمسیر استقرار، مثلاً /panel/ — فقط در vite.config خوانده می‌شود و در برنامه BASE_URL است. */
  readonly VITE_BASE_PATH?: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
