import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// قواعد docs/backend/04-coding-rules.md ۱۰. مرز ماژول‌ها با no-restricted-imports اجرا می‌شود
// (01 ۳: ماژول دیگر فقط از index.ts؛ api به ORM دست نمی‌زند؛ platform به ماژول‌ها وابسته نیست).
const crossModuleDeep = ['domain', 'application', 'infrastructure', 'api'].map((layer) => ({
  group: [`../../*/${layer}/**`, `../../../*/${layer}/**`],
  message: 'ماژول دیگر فقط از index.ts خودش وارد می‌شود (docs/backend/01 ۷).',
}));

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
    },
  },
  {
    files: ['src/modules/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: crossModuleDeep }] },
  },
  {
    files: ['src/modules/*/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...crossModuleDeep, { group: ['@mikro-orm/*'], message: 'کنترلر به ORM دست نمی‌زند (04 ۴).' }] },
      ],
    },
  },
  {
    files: ['src/platform/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/modules/**'], message: 'platform به ماژول‌های دامنه وابسته نیست (01 ۳).' }] }],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts', 'src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'زمان از Clock تزریقی می‌آید (04 ۱).' },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/config/**'],
    rules: {
      'no-restricted-properties': ['error', { object: 'process', property: 'env', message: 'پیکربندی فقط از src/config (04 ۹).' }],
    },
  },
  {
    files: ['**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'max-lines': 'off',
    },
  },
);
