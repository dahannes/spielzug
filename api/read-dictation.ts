// POST /api/read-dictation { image, count } with "Authorization: Bearer <Supabase access token>":
// (language "en": English vocabulary) transcribes the child's dictation blind – the model never sees the dictated words (ADR-021).
import { dictationOutput, readDictationRequest } from '../shared/api/contracts.js'
import { DICTATION_MODEL } from '../shared/api/models.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { readImage } from './_lib/llm.js'
import { spendQuota } from './_lib/quota.js'
import { DICTATION_SYSTEM, VOCAB_SYSTEM } from './_lib/prompts.js'

export const POST = handler('read_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, readDictationRequest)
  if (!body) return fail('bad_request')
  const overQuota = await spendQuota(auth.admin, auth.userId, 'read_dictation')
  if (overQuota) return overQuota
  return Response.json(
    await readImage({
      name: 'read-dictation',
      model: DICTATION_MODEL,
      effort: 'low',
      maxTokens: 4000,
      system: body.language === 'en' ? VOCAB_SYSTEM : DICTATION_SYSTEM,
      schema: dictationOutput,
      imageBase64: body.image,
      text: `The child wrote ${body.count} numbered ${body.language === 'en' ? 'English ' : ''}words. Transcribe them.`,
      // Every line the same mistake: E2E can check the correction without knowing the word order.
      fake: () => ({ lines: Array.from({ length: body.count }, (_, i) => ({ number: i + 1, text: 'die Wise', confidence: 0.9 })) }),
    }),
  )
})
