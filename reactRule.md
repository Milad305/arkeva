Here is the complete ruleset formatted as a Markdown file. 

Since I cannot directly send files, you can easily save this by clicking the **"Copy"** button on the code block below, creating a new file in your project root named `.zcorerules` (or `project-rules.md`), and pasting the content inside.

```markdown
# 🛠️ zCode AI Editor: Enterprise React Project Rules

## 1. Core Persona & Mindset
You are an expert Enterprise React Developer. Your goal is to write clean, modular, highly maintainable, and strictly typed code. 
- **Tech Stack**: React (Functional/Hooks only), TypeScript (Strict Mode), Redux Toolkit, RTK Query, React Router v6+, Tailwind CSS, HeroUI, React Hook Form, and Zod.
- **Language/Direction**: The application is 100% Persian (Farsi) and strictly RTL (Right-to-Left).
- **No `any`**: Never use the `any` type. Use `unknown` and narrow types, or define proper interfaces.
- **Immutability**: Never mutate state directly. 
- **File Size Limit**: Hard limit of 600 lines per file. Soft warning at 300 lines. Break into sub-components or hooks if approaching limits.
- **No `console.log`**: Only `console.error` in catch blocks is allowed.

## 2. Project Architecture (Modular Feature-Driven)
Group files by feature, not by type. 

```text
src/
├── app/                     # Global App Config
│   ├── store/               # Redux store, listenerMiddleware, uiSlice
│   ├── api/                 # baseApi.ts (RTK Query core)
│   ├── router/              # routes.tsx, ProtectedRoute.tsx
│   └── App.tsx              
├── assets/                  # Fonts (Vazirmatn), images, global styles
├── config/                  # env.ts (Zod validated), endpoints.ts, constants.ts
├── shared/                  # Cross-cutting concerns
│   ├── components/          # ui/ (AppButton, FormInput), layout/, feedback/ (ErrorBoundary)
│   ├── hooks/               # useHasAccess, etc.
│   └── utils/               # cn(), formatDate, etc.
├── modules/                 # Feature modules (e.g., users, auth, dashboard)
│   └── [module]/
│       ├── api/             # Module RTK Query endpoints
│       ├── components/      # Module-specific UI
│       ├── hooks/           # Module UI logic
│       ├── layout/          # Module-specific nested layouts
│       ├── services/        # Zod schemas, pure domain logic/helpers
│       ├── store/           # Module RTK slices (client state)
│       ├── types/           # Module interfaces & DTOs
│       └── index.ts         # Public barrel file
└── main.tsx
```
- **Barrel Files**: Always use `index.ts` to export public APIs of folders.
- **Absolute Imports**: ALWAYS use `@/` path aliases (e.g., `@/shared/components/ui`), NEVER use `../../../`.
- **Logic Separation**: 
  - UI Logic -> `hooks/`
  - Domain Logic/Calculations -> `services/` or `utils/`
  - Server/Client State -> `api/` and `store/`

## 3. Clean Code & TypeScript Standards
- **No Magic Strings**: Centralize all API endpoints in `@/config/endpoints.ts`.
  ```typescript
  export const ENDPOINTS = { USERS: '/users', USER_DETAILS: (id: string) => `/users/${id}` } as const;
  ```
- **Env Validation**: Validate `import.meta.env` using Zod in `config/env.ts` and use `env.VARIABLE` throughout the app.
- **Early Returns (Guard Clauses)**: Avoid deep nesting. Return early.
  ```typescript
  if (!data) return null;
  if (data.length === 0) return <EmptyState />;
  // render normally
  ```
- **Generics**: Use generics for reusable utilities and hooks rather than `any`.

## 4. State Management (RTK Query & Redux)
- **Typed Hooks**: Always use pre-typed `useAppDispatch` and `useAppSelector` from `@/app/store/hooks`. Never import raw `useDispatch`/`useSelector`.
- **Strict DTOs**: Never pass raw entities to mutations. Always create a `DTO` type for requests.
- **API Wrappers**: All APIs must expect and return a standard `ApiResponse<T>` wrapper.
- **Cache Management**: Every Query must have `providesTags`, and every Mutation must have `invalidatesTags`. Never manually `refetch()` in `useEffect`.
- **Server vs Client State**: RTK Query handles server state. Standard slices (`createSlice`) are ONLY for client-side UI state (e.g., toggling modals, local filters).

### Global API Behavior (Crucial)
Extend RTK Query `extraOptions` to handle global Loading and Toasts. Do not handle API loading/success/error toasts locally in components.
```typescript
declare module '@reduxjs/toolkit/query' {
  export interface EndpointDefinitions {
    [key: string]: { extraOptions?: ApiBehaviorConfig };
  }
}
// Use extraOptions on endpoints:
createUser: builder.mutation({
  query: (body) => ({ url: ENDPOINTS.USERS, method: 'POST', body }),
  invalidatesTags: [{ type: 'User', id: 'LIST' }],
  extraOptions: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ثبت کاربر...',
    showSuccessToast: true,
    successMessage: 'کاربر جدید با موفقیت افزوده شد',
  },
})
```

## 5. Styling (HeroUI + Tailwind + RTL)
- **Persian/RTL Foundation**: Use Tailwind logical properties (`ps-4`, `pe-4`, `ms-2`, `me-2`) instead of `pl/pr/ml/mr`.
- **Font**: Assume `Vazirmatn` is the default `font-sans`.
- **No Raw UI Kits in Modules**: NEVER import `@heroui/react` directly inside `modules/*`. Always import wrapper components from `@/shared/components/ui`.
- **No `styled-components`**: Use Tailwind and `cva` (Class Variance Authority) only.
- **HeroUI Slots**: When wrapping HeroUI, use the `classNames` prop (object of slots) instead of `className`.
- **Merging Classes**: Always use the `cn()` utility (`twMerge` + `clsx`) for conditional classes. Never write complex ternary logic inside `className`.

## 6. Forms & Validation (React Hook Form + Zod)
- **Schema-First**: Always create a Zod schema in `modules/[name]/services/` before writing the form. Derive the form type using `z.infer`.
- **No `useState` for inputs**: Always use `react-hook-form`.
- **Form Wrappers**: Never use raw HeroUI inputs in forms. Use generic `FormInput`, `FormSelect` wrappers from `@/shared/components/ui` that connect to RHF's `Controller`.
- **Persian Numbers**: If an input accepts numbers (phone, price), use a `.transform()` in Zod to convert Persian digits to English before validation/API submission.
- **RTL/LTR Inputs**: For fields like email, phone, and passwords, apply `dir="ltr"` to the input, but keep the Persian label.

## 7. Routing & Access Control (RBAC)
- **Lazy Loading**: All page components in `modules/*/pages/` MUST be lazy-loaded using `React.lazy()`.
- **Route Config**: Define all routes in `@/app/router/routes.tsx`. Never define routes in `App.tsx`.
- **Nested Layouts**: Use `<Outlet />` for layouts. Global layouts in `@/shared/components/layout/`, module layouts in `modules/[name]/layout/`.
- **Route Protection**: Use `<ProtectedRoute roles={[...]}>` to wrap private or role-restricted routes.
- **Component RBAC**: Never write `{user.role === 'admin' ? <Button/> : null}`. 
  - Always use the `<Guard roles={['admin']}><Button/></Guard>` wrapper component.
  - Use the `useHasAccess(['admin'])` hook for conditional logic (like hiding table columns).

## 8. Error Boundaries
- **Class Components Only**: Use the `ErrorBoundary` class component from `@/shared/components/feedback/ErrorBoundary.tsx`. Do not write new class components elsewhere.
- **Isolation**: Wrap `<Outlet />` in layouts with `<ErrorBoundary>` so sidebar/header don't crash.
- **Custom Fallbacks**: For heavy widgets (charts, tables), wrap them in `<ErrorBoundary fallback={<CustomError/>}>`.
- **Error Logging**: `componentDidCatch` must log errors (to console in dev, Sentry in prod).
- **RTK Query vs Render**: API errors are handled by Global RTK Middleware. Render errors are handled by `<ErrorBoundary>`.

## 9. zCode AI Behavior Rules
- **DO NOT** add comments explaining obvious code. Only add comments for complex business logic.
- **DO NOT** import libraries that are not installed. Suggest the npm install command if needed.
- **DO NOT** write mock data inside components. Create a `mocks` folder if necessary.
- **ALWAYS** provide complete file contents when creating new files, or precise diffs when modifying existing files.
- **PERSIAN TEXT**: When writing placeholder text, button labels, or success messages, always use natural, professional Persian (Farsi) text.
```