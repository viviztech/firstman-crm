import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share one real Postgres database rather than per-file isolation
    // (spec's own testing philosophy — real DB, not mocked). Several services query broadly
    // across shared-shape rows (e.g. round-robin lead assignment picks *any* executive-role
    // user), so running test files in parallel workers lets one file's afterAll cleanup
    // delete a row another file's test is mid-transaction with — a real foreign-key race,
    // not a flaky assertion. Sequential file execution trades suite speed for determinism.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/services/**/*.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
