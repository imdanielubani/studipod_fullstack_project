import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Tokens never go to Web Storage (docs/security/security-architecture.md).
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'Use the storage helpers in src/lib/storage; never store tokens or personal data.',
        },
        {
          name: 'sessionStorage',
          message:
            'Use the storage helpers in src/lib/storage; never store tokens or personal data.',
        },
      ],
    },
  },
  {
    // The storage wrapper is the single sanctioned access point for Web Storage.
    files: ['src/lib/storage/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    // Command-line tooling reports progress on stdout.
    files: ['infrastructure/scripts/**'],
    rules: { 'no-console': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'public/sw.js',
    'src/types/generated/**',
  ]),
]);
