// POST /api/debug-scan { image, model?, effort? } with "Authorization: Bearer <Supabase access token>":
// free reading of any sheet for the debug view; stores nothing (ADR-020). Outside `vite dev` only
// for accounts in DEBUG_USERS – everyone else gets 404.
import { debugScanRequest, scanOutput, type ScanOutput } from '../shared/api/contracts.js'
import { authUser, mayDebug } from './_lib/auth.js'
import { fail, handler, parseBody } from './_lib/http.js'
import { readImage } from './_lib/llm.js'
import { SCAN_SYSTEM } from './_lib/prompts.js'

export const POST = handler('read_failed', async (request) => {
  const auth = await authUser(request)
  if ('error' in auth) return auth.error
  if (!mayDebug(auth)) return fail('not_found')
  const body = await parseBody(request, debugScanRequest)
  if (!body) return fail('bad_request')
  return Response.json(
    await readImage({
      name: 'debug-scan',
      model: body.model,
      effort: body.effort,
      // Debug only, also Opus at effort high: room for thinking, still within the client timeout
      maxTokens: 8000,
      system: SCAN_SYSTEM,
      schema: scanOutput,
      imageBase64: body.image,
      text: 'Read this sheet.',
      fake: (): ScanOutput => ({
        subject: 'german',
        items: [{ label: '1', task: 'die Wiese', written_answer: 'die Wise', expected_answer: 'die Wiese', correct: false, legibility: 3, confidence: 0.9, note: null }],
        summary: 'Test.',
      }),
    }),
  )
})
