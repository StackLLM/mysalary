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
  build: {
    rollupOptions: {
      output: {
        // Les bibliothèques lourdes à part : elles ne changent pas entre deux versions de l'app, le navigateur les garde.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (/recharts|d3-|victory-vendor/.test(id)) return 'graphiques'
          if (/framer-motion|motion-/.test(id)) return 'animations'
          if (/@radix-ui/.test(id)) return 'radix'
          if (/react-dom|react-router|@remix-run|scheduler|\/react\//.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
