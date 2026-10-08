/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Local uniquement : pas d'authentification en v1 (Plan.md § 5.7).
    host: '127.0.0.1',
    port: 6010,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3010' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
