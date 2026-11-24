import { createHmac } from 'node:crypto'
import { teamPinRequest } from '../shared/api/contracts.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'

// Same limit as check_team_pin (5 failures lock the gate for 15 minutes).
const MAX_ATTEMPTS = 5

function pinHash(pin: string): string {
  // Own key, so rotating the Supabase keys does not invalidate every team PIN.
  const secret = process.env.PIN_PEPPER
  if (!secret) throw new Error('PIN_PEPPER is not configured')
  return createHmac('sha256', secret).update(pin).digest('hex')
}

export const POST = handler('trainer_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, teamPinRequest)
  if (!body) return fail('trainer_bad_request')

  const membership = await auth.userClient.from('family_members').select('family_id').eq('user_id', auth.userId).single()
  if (membership.error) throw membership.error
  const familyId = membership.data.family_id

  if (body.action === 'status') {
    const settings = await auth.admin.from('team_security_settings').select('family_id').eq('family_id', familyId).maybeSingle()
    if (settings.error) throw settings.error
    return Response.json({ configured: !!settings.data })
  }

  if (body.action === 'set') {
    const saved = await auth.admin.from('team_security_settings').upsert({
      family_id: familyId,
      pin_hash: pinHash(body.pin),
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    })
    if (saved.error) throw saved.error
    return Response.json({ configured: true })
  }

  const checked = await auth.userClient.rpc('check_team_pin', {
    p_family_id: familyId,
    p_candidate_hash: pinHash(body.pin),
  })
  if (checked.error) throw checked.error
  if (checked.data) return Response.json({ configured: true, verified: true })

  // Tell the trainer how many tries are left, or until when the gate is locked (SR-08).
  const state = await auth.admin.from('team_security_settings').select('failed_attempts, locked_until').eq('family_id', familyId).maybeSingle()
  if (state.error) throw state.error
  if (!state.data) return fail('pin_invalid')
  if (state.data.locked_until && new Date(state.data.locked_until) > new Date()) return fail('pin_locked', { lockedUntil: state.data.locked_until })
  return fail('pin_invalid', { attemptsLeft: Math.max(MAX_ATTEMPTS - state.data.failed_attempts, 0) })
})
