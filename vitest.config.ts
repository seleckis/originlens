import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/unit/**/*.test.mjs",
      "tests/integration/**/*.test.mjs"
    ],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
