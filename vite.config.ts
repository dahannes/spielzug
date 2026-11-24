import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { devApi } from './scripts/vite-dev-api'

// Local HTTPS (npm run dev:cert) so the tablet gets the live camera; E2E stays on plain http.
const cert = '.certs/dev.pem'
const https =
  existsSync(cert) && process.env.E2E !== '1'
    ? { cert: readFileSync(cert), key: readFileSync('.certs/dev-key.pem') }
    : undefined

// Shown in the trainer area (Konto). Vercel builds without .git: `npm run deploy:prod` passes the
// commit in APP_COMMIT; locally it comes from git.
function commit(): string {
  if (process.env.APP_COMMIT) return process.env.APP_COMMIT
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unbekannt'
  }
}
const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit()),
    __APP_BUILT__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    https,
    proxy: {
      // The local Supabase stack, same origin as the app (src/lib/supabase.ts).
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // The libraries change less often than the app: their own chunks stay cached across
        // deploys. Named packages only – a catch-all /node_modules/ would pull the lazily loaded
        // MediaPipe into the start page.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler|@tanstack)[\\/]/ },
            { name: 'supabase', test: /node_modules[\\/](@supabase|zod)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts', 'shared/**/*.test.ts'],
    // npm run test:coverage – unit and server tests only; the UI is covered by E2E.
    coverage: {
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/*.test.ts', 'shared/database.types.ts'],
      reporter: ['text-summary', 'html'],
    },
  },
})
