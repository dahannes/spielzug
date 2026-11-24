// POST /api/delete-word-list { listId } with "Authorization: Bearer <Supabase access token>":
// deletes a word list with its rounds (cascade), its spoken audio and the photos of its rounds.
// The app cannot do the audio part itself: members may only read the audio bucket.
import { AUDIO_BUCKET } from '../shared/dictation/audio.js'
import { SCAN_BUCKET } from '../shared/dictation/scans.js'
import { deleteWordListRequest } from '../shared/api/contracts.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'

export const POST = handler('delete_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, deleteWordListRequest)
  if (!body) return fail('bad_request')

  // As the user: RLS answers "not found" for lists of other families.
  const deleted = await auth.userClient.from('word_lists').delete().eq('id', body.listId).select('family_id').maybeSingle()
  if (deleted.error) throw deleted.error
  if (!deleted.data) return fail('not_found')

  // Secret key only for the folders of the list just deleted.
  const folder = `${deleted.data.family_id}/${body.listId}`
  const { admin } = auth
  async function clear(bucket: string): Promise<number> {
    const storage = admin.storage.from(bucket)
    const files = await storage.list(folder, { limit: 1000 })
    if (files.error) throw files.error
    if (files.data.length) {
      const removed = await storage.remove(files.data.map((f) => `${folder}/${f.name}`))
      if (removed.error) throw removed.error
    }
    return files.data.length
  }
  return Response.json({ removedAudio: await clear(AUDIO_BUCKET), removedScans: await clear(SCAN_BUCKET) })
})
