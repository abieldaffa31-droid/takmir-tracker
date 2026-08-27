import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
