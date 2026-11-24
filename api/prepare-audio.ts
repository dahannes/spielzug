// POST /api/prepare-audio { listId } with "Authorization: Bearer <Supabase access token>":
// makes the missing spoken MP3s of a list with Polly and removes stale ones (ADR-022).
import { AUDIO_BUCKET, audioPath, audioSsml } from '../shared/dictation/audio.js'
import type { ListWord } from '../shared/dictation/words.js'
import { prepareAudioRequest } from '../shared/api/contracts.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { aiFake } from './_lib/llm.js'
import { synthesize } from './_lib/polly.js'
import { spendQuota } from './_lib/quota.js'

export const POST = handler('audio_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, prepareAudioRequest)
  if (!body) return fail('bad_request')

  // Read as the user: RLS answers "not found" for lists of other families.
  const list = await auth.userClient.from('word_lists').select('id, family_id, words').eq('id', body.listId).maybeSingle()
  if (list.error) throw list.error
  if (!list.data) return fail('not_found')
  const familyId: string = list.data.family_id
  const words = list.data.words as ListWord[]

  // Storage is written with the secret key: members may only read audio.
  const storage = auth.admin.storage.from(AUDIO_BUCKET)
  const folder = `${familyId}/${body.listId}`
  const existing = await storage.list(folder, { limit: 1000 })
  if (existing.error) throw existing.error
  const have = new Set(existing.data.map((o) => `${folder}/${o.name}`))
  const wanted = new Set(words.map((w) => audioPath(familyId, body.listId, w)))
  const missing = words.filter((w) => !have.has(audioPath(familyId, body.listId, w)))
  // Only a run that makes recordings costs money; later rounds of the same list are free.
  if (missing.length) {
    const overQuota = await spendQuota(auth.admin, auth.userId, 'prepare_audio')
    if (overQuota) return overQuota
  }
  if (aiFake()) return Response.json({ made: 0, removed: 0, total: words.length })
  // Recordings of removed or changed words, or of an earlier voice
  const stale = [...have].filter((path) => !wanted.has(path))
  if (stale.length) {
    const removed = await storage.remove(stale)
    if (removed.error) throw removed.error
  }

  for (let i = 0; i < missing.length; i += 5) {
    await Promise.all(
      missing.slice(i, i + 5).map(async (w) => {
        const up = await storage.upload(audioPath(familyId, body.listId, w), await synthesize(audioSsml(w)), {
          contentType: 'audio/mpeg',
          upsert: true,
        })
        if (up.error) throw up.error
      }),
    )
  }
  return Response.json({ made: missing.length, removed: stale.length, total: words.length })
})
