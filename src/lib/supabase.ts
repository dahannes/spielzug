import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../shared/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set')
}

const LOOPBACK = ['127.0.0.1', 'localhost']

/**
 * The local stack is configured as 127.0.0.1. In the browser it is reached through the dev
 * server's /supabase proxy instead: same origin, so it works from the tablet in the LAN and
 * over local HTTPS (no mixed content).
 */
export function resolveSupabaseUrl(configured: string, pageOrigin: string | undefined): string {
  const target = new URL(configured)
  if (pageOrigin && LOOPBACK.includes(target.hostname)) return `${pageOrigin}/supabase`
  return target.origin
}

export const supabase = createClient<Database>(
  resolveSupabaseUrl(url, typeof window === 'undefined' ? undefined : window.location.origin),
  key,
)
