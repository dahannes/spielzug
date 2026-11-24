// Vitest for Stryker (npm run test:mutation): only the shared/ tests. They need neither Supabase
// nor the app's Vite plugins, so mutation testing runs anywhere (CI job `quality`).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['shared/**/*.test.ts'] },
})
