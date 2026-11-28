import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/features/authentication/**/*.{ts,tsx}',
        'src/services/**/*.ts',
        'src/components/ui/**/*.tsx',
        'src/hooks/**/*.ts',
        'src/lib/**/*.ts',
      ],
      exclude: ['**/*.test.{ts,tsx}'],
      reporter: ['text-summary', 'html'],
    },
  },
});
