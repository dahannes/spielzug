import { createHash } from 'node:crypto'
import { acceptTeamInvitationRequest } from '../shared/api/contracts.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'

export const POST = handler('trainer_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, acceptTeamInvitationRequest)
  if (!body) return fail('trainer_bad_request')

  const tokenHash = createHash('sha256').update(body.token).digest('hex')
  const accepted = await auth.userClient.rpc('accept_team_invitation', { p_token_hash: tokenHash })
  if (accepted.error) throw accepted.error
  if (accepted.data === 'invalid_invitation') return fail('invitation_invalid')
  if (accepted.data === 'already_member') return fail('account_already_on_team')
  if (accepted.data !== 'accepted') throw new Error('Unexpected invitation result')

  const membership = await auth.userClient.from('family_members').select('family_id').eq('user_id', auth.userId).single()
  if (membership.error) throw membership.error
  return Response.json({ familyId: membership.data.family_id })
})
