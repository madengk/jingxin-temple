import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname),
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/matchmake": { target: "http://localhost:2567", changeOrigin: true },
      "/colyseus": { target: "ws://localhost:2567", ws: true },
    },
  },
});
