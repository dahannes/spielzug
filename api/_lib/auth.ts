import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fail } from './http.js'

export interface AuthedUser {
  userId: string
  email: string | undefined
  /** Acts as the user: RLS decides what it may read and write. */
  userClient: SupabaseClient
  /** Secret key, bypasses RLS: only for what the user may not do (writing audio to storage). */
  admin: SupabaseClient
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** Checks the Supabase access token; returns the user and its clients, or an error response. */
export async function authUser(request: Request): Promise<AuthedUser | { error: Response }> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !secret || !publishable) return { error: fail('not_configured') }
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return { error: fail('unauthorized') }
  const admin = createClient(url, secret, noSession)
  const user = await admin.auth.getUser(token)
  if (user.error || !user.data.user) return { error: fail('unauthorized') }
  const userClient = createClient(url, publishable, { ...noSession, global: { headers: { Authorization: `Bearer ${token}` } } })
  return { userId: user.data.user.id, email: user.data.user.email, userClient, admin }
}

/**
 * Debug tools (model and effort of choice) cost real money: open for every account only where
 * DEBUG_OPEN=1 (set by the Vite dev server, never on a deployment), otherwise only for the
 * accounts listed in DEBUG_USERS (comma-separated emails). Closed by default, also self-hosted.
 */
export function mayDebug(user: Pick<AuthedUser, 'email'>): boolean {
  if (process.env.DEBUG_OPEN === '1') return true
  const allowed = (process.env.DEBUG_USERS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return !!user.email && allowed.includes(user.email.toLowerCase())
}
