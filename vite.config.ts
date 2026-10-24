import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const VENDOR = ['react', 'react-dom', 'zustand', 'i18next', 'react-i18next']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@supabase/supabase-js/')) return 'supabase'
          if (VENDOR.some((name) => id.includes(`/node_modules/${name}/`))) return 'vendor'
          if (id.includes('/src/features/player-catalog/recordedCollections.ts') || id.includes('/src/data/league-collections/')) return 'recorded-collections'
        },
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
})
