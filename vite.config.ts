import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const VENDOR = ['react', 'react-dom', 'zustand', 'i18next', 'react-i18next']

/** Partition the large canonical array at build time; source data and row order stay intact. */
function splitLeagueRows(): Plugin {
  const rootId = '\0league-rows'
  let parts: unknown[][] = []
  return {
    name: 'split-league-rows', apply: 'build', enforce: 'pre',
    resolveId(source) {
      if (source.replaceAll('\\', '/').endsWith('/league-collections/players.json')) return rootId
      if (source.startsWith(`${rootId}:`)) return source
    },
    load(id) {
      if (id === rootId) {
        const source = fileURLToPath(new URL('./src/data/league-collections/players.json', import.meta.url))
        this.addWatchFile(source)
        const rows = JSON.parse(readFileSync(source, 'utf8')) as unknown[]
        parts = Array.from({ length: Math.ceil(rows.length / 300) }, (_, i) => rows.slice(i * 300, (i + 1) * 300))
        return parts.map((_, i) => `import part${i} from ${JSON.stringify(`${rootId}:${i}`)};`).join('\n') + `\nexport default [${parts.map((_, i) => `...part${i}`).join(',')}];`
      }
      if (id.startsWith(`${rootId}:`)) return `export default JSON.parse(${JSON.stringify(JSON.stringify(parts[Number(id.slice(rootId.length + 1))]))});`
    },
  }
}

export default defineConfig({
  plugins: [splitLeagueRows(), react(), tailwindcss()],
  // Large editorial JSON has no named imports; parse compact data once per module.
  json: { stringify: true },
  build: {
    rollupOptions: {
      output: {
        // Splitting mutually dependent features must preserve their initialization order.
        strictExecutionOrder: true,
        // Vite 8's equivalent of manualChunks; do not pull dependencies into their parent's group.
        codeSplitting: { includeDependenciesRecursively: false, groups: [{ name(id) {
          const path = id.replaceAll('\\', '/')
          if (path.startsWith('\0league-rows:')) return `collection-players-${path.split(':').at(-1)}`
          if (path.includes('/node_modules/@supabase/')) return 'supabase'
          if (VENDOR.some((name) => path.includes(`/node_modules/${name}/`))) return 'vendor'
          if (path.endsWith('/src/features/player-catalog/recordedCollections.ts')) return 'recorded-collections'
          // Keep current data out of the historical replay chunk and cache each source separately.
          const collection = path.match(/\/src\/data\/league-collections\/([^/]+)\.json$/)
          if (collection) return `collection-${collection[1]}`
          const data = path.match(/\/src\/data\/(.+)\.json$/)?.[1]
          if (data) return `data-${(data.includes('/') ? data.slice(0, data.lastIndexOf('/')) : data).replaceAll('/', '-')}`
          const locale = path.match(/\/src\/i18n\/locales\/([^/]+)\//)
          if (locale) return `locale-${locale[1]}`
          if (path.includes('/src/features/local-match/')) return 'match'
          if (path.includes('/src/features/player-catalog/')) return 'catalog'
          return null
        } }] },
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
})
