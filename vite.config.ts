import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    globals: true,
    // A suíte tem builds de geometria/CSG pesados e o ambiente de CI é mais
    // lento que o dev; o global cobre os arquivos leves e os testes caros
    // declaram 60 s explicitamente.
    testTimeout: 60_000,
    exclude: [...configDefaults.exclude, "**/.worktrees/**"],
  },
});
