// POST /api/delete-team { teamName } with "Authorization: Bearer <Supabase access token>":
// the team admin deletes the team with everything in it – players, lists, rounds, invitations,
// PIN, all files in Storage – and the accounts of all its trainers (SR-09). An account belongs to
// exactly one team, so nothing personal is left. The typed team name confirms the intent.
import { deleteTeamRequest } from '../shared/api/contracts.js'
import { AUDIO_BUCKET } from '../shared/dictation/audio.js'
import { SCAN_BUCKET } from '../shared/dictation/scans.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { removeFolder } from './_lib/storage.js'

const BUCKETS = [AUDIO_BUCKET, SCAN_BUCKET, 'player-photos']

export const POST = handler('delete_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, deleteTeamRequest)
  if (!body) return fail('bad_request')

  const member = await auth.userClient.from('family_members').select('family_id, role').eq('user_id', auth.userId).single()
  if (member.error) throw member.error
  if (member.data.role !== 'admin') return fail('forbidden')
  const familyId: string = member.data.family_id
  const team = await auth.userClient.from('families').select('name').eq('id', familyId).single()
  if (team.error) throw team.error
  if (team.data.name.trim() !== body.teamName.trim()) return fail('bad_request')

  const members = await auth.admin.from('family_members').select('user_id').eq('family_id', familyId)
  if (members.error) throw members.error

  // Rows first (one cascade from the family), then files and accounts: a failure later leaves
  // unreachable files or empty accounts, never a half-deleted team that still shows up.
  const deleted = await auth.admin.from('families').delete().eq('id', familyId)
  if (deleted.error) throw deleted.error
  let removedFiles = 0
  for (const bucket of BUCKETS) removedFiles += await removeFolder(auth.admin, bucket, familyId)
  for (const { user_id } of members.data) {
    const gone = await auth.admin.auth.admin.deleteUser(user_id)
    if (gone.error) throw gone.error
  }
  return Response.json({ removedFiles, removedAccounts: members.data.length })
})
