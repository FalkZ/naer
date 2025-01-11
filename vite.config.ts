import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ include: ["lib"] })],
  test: {
    include: ["lib/**/*.test.ts"],
    testTimeout: 1000000,
  },
  build: {
    copyPublicDir: false,
    rollupOptions: {
      external: ["agenda"],
    },
    lib: {
      entry: "./lib/naer.ts",
      formats: ["es", "umd"],
      name: "naer",
      fileName: "naer",
    },
  },
});
