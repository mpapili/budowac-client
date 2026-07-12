import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  envPrefix: 'VITE_',
  test: {
    environment: 'jsdom',
  },
});
