import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src.old فقط آرشیو مرجع است و کامپایل نمی‌شود
  { ignores: ['dist', 'node_modules', 'src.old'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // مطابق AGENTS.md: ممنوع `any`
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // مطابق AGENTS.md: بدون console.log — فقط console.error در catch
      'no-console': ['error', { allow: ['error'] }],

      // بوم RTL است: جهت‌های منطقی اجباری‌اند، نه فیزیکی
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'JSXAttribute[name.name="className"] > Literal[value=/(^|\\s)(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/]',
          message:
            'در RTL از جهت‌های منطقی استفاده کن (ms/me/ps/pe/start/end/border-s/border-e) یا کلاس‌های kit.',
        },
      ],
    },
  },
  // فایل‌های پیکربندی در محیط Node اجرا می‌شوند
  {
    files: ['*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
