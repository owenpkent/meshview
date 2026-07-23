import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'media/webview.js', 'media/webview.js.map', '**/*.map'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // Webview code runs in the browser context.
    files: ['src/webview/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Extension host code runs in Node.
    files: ['src/extension.ts', 'src/stlEditor.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tests run under vitest (Node globals).
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Build/config scripts are CommonJS run directly by Node.
    files: ['*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
