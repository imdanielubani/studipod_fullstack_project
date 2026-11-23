// Shared ESLint flat config for TypeScript services running on Node.js.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @param {{ tsconfigRootDir: string }} options
 */
export function nodeConfig({ tsconfigRootDir }) {
  return tseslint.config(
    {
      ignores: [
        'dist/**',
        'coverage/**',
        'node_modules/**',
        'prisma/migrations/**',
        '**/generated/**',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    prettier,
    {
      languageOptions: {
        globals: { ...globals.node, ...globals.jest },
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        'no-console': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['**/*.mjs', '**/*.cjs', '**/*.js'],
      ...tseslint.configs.disableTypeChecked,
    },
  );
}
