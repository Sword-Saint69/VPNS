import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * GitHub Pages deploys only `dist/` — the dashboard fetches
 * `tagged/summary_sword-saint69.json` etc. at runtime, so the tagged
 * data files must be staged inside dist or the live site 404s them.
 */
function copyTaggedData() {
  return {
    name: 'copy-tagged-data',
    closeBundle() {
      const src = resolve(process.cwd(), 'tagged')
      const dest = resolve(process.cwd(), 'dist', 'tagged')
      if (!existsSync(src)) {
        this.warn('tagged/ not found — dashboard will have no data on Pages')
        return
      }
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), copyTaggedData()],
  base: '/VPNS/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
  },
})
