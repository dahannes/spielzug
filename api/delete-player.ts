// POST /api/delete-player { playerId } with "Authorization: Bearer <Supabase access token>":
// deletes a player with all their rounds (cascade), the sheet photos of those rounds and the
// player photo (SR-09). Any trainer of the team may do it, like editing a player.
import { deletePlayerRequest } from '../shared/api/contracts.js'
import { SCAN_BUCKET } from '../shared/dictation/scans.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { removeFiles } from './_lib/storage.js'

const PHOTO_BUCKET = 'player-photos'

export const POST = handler('delete_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, deletePlayerRequest)
  if (!body) return fail('bad_request')

  // As the user: RLS answers "not found" for players of other teams.
  const player = await auth.userClient.from('children').select('id, photo_path').eq('id', body.playerId).maybeSingle()
  if (player.error) throw player.error
  if (!player.data) return fail('not_found')
  const rounds = await auth.userClient.from('dictation_rounds').select('scan_path').eq('child_id', body.playerId)
  if (rounds.error) throw rounds.error

  const deleted = await auth.userClient.from('children').delete().eq('id', body.playerId)
  if (deleted.error) throw deleted.error

  // Files only after the rows are gone: a failure here leaves unreachable files, never broken rows.
  const scans = rounds.data.flatMap((r) => (r.scan_path ? [r.scan_path] : []))
  return Response.json({
    removedScans: await removeFiles(auth.admin, SCAN_BUCKET, scans),
    removedPhotos: await removeFiles(auth.admin, PHOTO_BUCKET, player.data.photo_path ? [player.data.photo_path] : []),
  })
})
