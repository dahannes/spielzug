// POST /api/read-vocab-list { image } with "Authorization: Bearer <Supabase access token>":
// reads a photographed English vocabulary list – English words with their German meaning (SR-15).
import { readVocabListRequest, vocabListOutput, type VocabListOutput } from '../shared/api/contracts.js'
import { DICTATION_MODEL } from '../shared/api/models.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { readImage } from './_lib/llm.js'
import { spendQuota } from './_lib/quota.js'
import { VOCAB_LIST_SYSTEM } from './_lib/prompts.js'

export const POST = handler('read_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, readVocabListRequest)
  if (!body) return fail('bad_request')
  const overQuota = await spendQuota(auth.admin, auth.userId, 'read_list')
  if (overQuota) return overQuota
  return Response.json(
    await readImage({
      name: 'read-vocab-list',
      model: DICTATION_MODEL,
      effort: 'low',
      maxTokens: 8000,
      system: VOCAB_LIST_SYSTEM,
      schema: vocabListOutput,
      imageBase64: body.image,
      text: 'Read this vocabulary list.',
      fake: (): VocabListOutput => ({
        title: 'Vocabulary (Test)',
        words: [
          { english: 'dog', german: 'der Hund' },
          { english: 'cat', german: 'die Katze' },
        ],
      }),
    }),
  )
})
