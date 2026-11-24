// POST /api/read-word-list { image } with "Authorization: Bearer <Supabase access token>":
// reads a photographed school word list and writes an example sentence per word (ADR-021).
import { readWordListRequest, wordListOutput, type WordListOutput } from '../shared/api/contracts.js'
import { DICTATION_MODEL } from '../shared/api/models.js'
import { authUser } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { readImage } from './_lib/llm.js'
import { spendQuota } from './_lib/quota.js'
import { LIST_SYSTEM } from './_lib/prompts.js'

export const POST = handler('read_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  const body = await parseBody(request, readWordListRequest)
  if (!body) return fail('bad_request')
  const overQuota = await spendQuota(auth.admin, auth.userId, 'read_list')
  if (overQuota) return overQuota
  return Response.json(
    await readImage({
      name: 'read-word-list',
      model: DICTATION_MODEL,
      effort: 'low',
      maxTokens: 8000,
      system: LIST_SYSTEM,
      schema: wordListOutput,
      imageBase64: body.image,
      text: 'Read this word list.',
      fake: (): WordListOutput => ({
        title: 'Lernwörter (Test)',
        words: [
          { article: 'der', word: 'Hund', form: null, sentence: 'Der Hund bellt laut.' },
          { article: 'die', word: 'Wiese', form: null, sentence: 'Die Wiese ist grün.' },
        ],
      }),
    }),
  )
})
