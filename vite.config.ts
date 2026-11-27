/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The polyfill is the only thing in the bundle that calls fetch(); this is a single-chunk static app.
    modulePreload: { polyfill: false },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
