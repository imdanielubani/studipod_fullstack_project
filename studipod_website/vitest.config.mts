import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` throws outside a React Server environment; tests run in Node.
      "server-only": fromRoot("./tests/mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // UI components are exercised by the Playwright suite; unit/integration
      // coverage targets server, security and library code.
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts", "src/config/**/*.ts"],
      exclude: ["src/generated/**", "src/config/features.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
