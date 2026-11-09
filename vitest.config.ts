import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // One file at a time: two in-memory Postgres engines at once fail to start.
  test: { include: ["tests/**/*.test.ts"], environment: "node", testTimeout: 60_000, hookTimeout: 60_000, fileParallelism: false },
});
