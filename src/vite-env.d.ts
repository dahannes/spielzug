/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

/** Build info from vite.config.ts: package version, short commit, build time (ISO). */
declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string
declare const __APP_BUILT__: string
