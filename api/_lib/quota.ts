// Daily quotas for the paid calls (SR-44, ADR-044), counted in Postgres (`consume_ai_quota`):
// per account, and a cap over all accounts that bounds the bill even with many new accounts.
import type { SupabaseClient } from '@supabase/supabase-js'
import { fail } from './http.js'
import { aiFake } from './llm.js'

type QuotaKind = 'read_dictation' | 'read_list' | 'prepare_audio'

/** Per account and day. Tune with real usage (Langfuse) – the numbers live only here. */
const PER_ACCOUNT: Record<QuotaKind, number> = { read_dictation: 30, read_list: 10, prepare_audio: 20 }
/** Over all accounts and day. */
const GLOBAL: Record<QuotaKind, number> = { read_dictation: 500, read_list: 150, prepare_audio: 300 }

/**
 * Counts one paid call for the account: null if it may run, otherwise the 429 response.
 * Fake calls (AI_FAKE) count for the account only, never towards the global cap.
 */
export async function spendQuota(admin: SupabaseClient, userId: string, kind: QuotaKind): Promise<Response | null> {
  const result = await admin.rpc('consume_ai_quota', {
    p_user_id: userId,
    p_kind: kind,
    p_account_limit: PER_ACCOUNT[kind],
    p_global_limit: aiFake() ? null : GLOBAL[kind],
  })
  if (result.error) throw result.error
  if (result.data === 'ok') return null
  return fail('quota_exceeded', { scope: result.data === 'global_limit' ? 'global' : 'account' })
}
