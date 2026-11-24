import { createHash, randomBytes } from 'node:crypto'
import { createTeamInvitationRequest } from '../shared/api/contracts.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'

export const POST = handler('trainer_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, createTeamInvitationRequest)
  if (!body) return fail('trainer_bad_request')

  const member = await auth.userClient.from('family_members').select('family_id, role').eq('user_id', auth.userId).single()
  if (member.error) throw member.error
  if (member.data.role !== 'admin') return fail('forbidden')

  const trainers = await auth.userClient.rpc('get_team_trainers')
  if (trainers.error) throw trainers.error
  const email = body.email.trim().toLowerCase()
  const existingEmails = trainers.data as { email: string | null }[]
  if (existingEmails.some((trainer) => trainer.email?.toLowerCase() === email)) return fail('trainer_bad_request')

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // No list of old invitations is needed: accepted, revoked and expired ones go, so no invited
  // email is kept longer than the invitation is useful (data map).
  const cleaned = await auth.admin
    .from('team_invitations')
    .delete()
    .eq('family_id', member.data.family_id)
    .or(`accepted_at.not.is.null,revoked_at.not.is.null,expires_at.lt.${new Date().toISOString()}`)
  if (cleaned.error) throw cleaned.error

  const revoked = await auth.admin
    .from('team_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('family_id', member.data.family_id)
    .eq('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null)
  if (revoked.error) throw revoked.error

  const inserted = await auth.admin.from('team_invitations').insert({
    family_id: member.data.family_id,
    email,
    token_hash: tokenHash,
    created_by: auth.userId,
    expires_at: expiresAt,
  })
  if (inserted.error) throw inserted.error
  return Response.json({ token, expiresAt })
})
