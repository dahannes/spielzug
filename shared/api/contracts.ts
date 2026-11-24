// Contracts of the server functions in api/: request schemas (validated on the server) and
// response types. The browser imports types only (`import type`), so zod stays out of its bundle.
import { z } from 'zod'
import { EFFORTS, MODEL_IDS } from './models.js'

/** Base64 JPEG without data: prefix; below Vercel's 4.5 MB body limit. */
const image = z.string().min(100).max(4_000_000)

export const readWordListRequest = z.object({ image })
export const readVocabListRequest = z.object({ image })
/** `en`: English vocabulary (Vokabeln), else a German dictation. */
export const readDictationRequest = z.object({ image, count: z.int().min(1).max(40), language: z.enum(['de', 'en']).default('de') })
export const prepareAudioRequest = z.object({ listId: z.uuid() })
export const deleteWordListRequest = z.object({ listId: z.uuid() })
export const deletePlayerRequest = z.object({ playerId: z.uuid() })
export const deleteTeamRequest = z.object({ teamName: z.string().min(1).max(80) })
export const createTeamInvitationRequest = z.object({ email: z.email().max(254) })
export const acceptTeamInvitationRequest = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/) })
export const teamPinRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('set'), pin: z.string().regex(/^\d{4}$/) }),
  z.object({ action: z.literal('check'), pin: z.string().regex(/^\d{4}$/) }),
])
export const debugScanRequest = z.object({
  image,
  model: z.enum(MODEL_IDS).default('claude-haiku-5-5'),
  effort: z.enum(EFFORTS).default('low'),
})

// ---- structured LLM outputs ----------------------------------------------------------------

export const wordListOutput = z.object({
  title: z.string().describe('Short title for the list, e.g. "Lernwörter Woche 3"'),
  words: z.array(
    z.object({
      article: z.enum(['der', 'die', 'das']).nullable().describe('Article if printed with the word'),
      word: z.string().describe('The word exactly as printed, with its capitalisation'),
      form: z.string().nullable().describe('Extra form printed in brackets, e.g. "bleibt"; null if none'),
      sentence: z
        .string()
        .describe('A short, simple German sentence for a 9-year-old that uses exactly this word form, so article and capitalisation are clear when read aloud'),
    }),
  ),
})

export const vocabListOutput = z.object({
  title: z.string().describe('Short title for the list, e.g. "Unit 3: Animals"'),
  words: z.array(
    z.object({
      english: z.string().describe('The English word or phrase exactly as printed, with its capitalisation'),
      german: z.string().describe('Its German meaning as printed; nouns with der, die or das'),
    }),
  ),
})

export const dictationOutput = z.object({
  lines: z.array(
    z.object({
      number: z.int().nullable().describe('The number the child wrote before the word; null if none'),
      text: z
        .string()
        .nullable()
        .describe('What the child wrote, letter by letter as written – keep every spelling mistake and the capitalisation; null if empty'),
      confidence: z.number().min(0).max(1).describe('How sure you are about every single letter'),
    }),
  ),
})

export const scanOutput = z.object({
  subject: z.enum(['math', 'german', 'english', 'other']).describe('Subject of the sheet'),
  items: z
    .array(
      z.object({
        label: z.string().nullable().describe('Number or label written next to the task (e.g. "A1", "3b"); null if none'),
        task: z.string().describe('The task as written on the paper, e.g. "345 + 678" or the English word'),
        written_answer: z.string().nullable().describe('What the child wrote as the answer, exactly as written; null if none'),
        expected_answer: z.string().nullable().describe('The correct answer, worked out by you; null if it cannot be determined'),
        correct: z.boolean().nullable().describe('written_answer equals expected_answer; null if no answer or not decidable'),
        legibility: z.int().min(1).max(3).describe('1 hard to read, 2 readable, 3 clear'),
        confidence: z.number().min(0).max(1).describe('How sure your reading of this task is'),
        note: z.string().nullable().describe('Short note in German, e.g. about format or a copying slip; null if nothing to say'),
      }),
    )
    .describe('Every task on the sheet, top to bottom'),
  summary: z.string().describe('Two or three short sentences in German for the parents'),
})

// ---- responses -----------------------------------------------------------------------------

/** What every LLM-backed response carries besides its output. */
interface LlmMeta {
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  traceId?: string
}

export type LlmResponse<T> = { output: T } & LlmMeta
export type WordListOutput = z.infer<typeof wordListOutput>
export type VocabListOutput = z.infer<typeof vocabListOutput>
type DictationOutput = z.infer<typeof dictationOutput>
export type ScanOutput = z.infer<typeof scanOutput>

/** Every endpoint: what the browser sends and gets back. */
export interface ApiRoutes {
  '/api/read-word-list': { request: z.input<typeof readWordListRequest>; response: LlmResponse<WordListOutput> }
  '/api/read-vocab-list': { request: z.input<typeof readVocabListRequest>; response: LlmResponse<VocabListOutput> }
  '/api/read-dictation': { request: z.input<typeof readDictationRequest>; response: LlmResponse<DictationOutput> }
  '/api/prepare-audio': { request: z.input<typeof prepareAudioRequest>; response: { made: number; removed: number; total: number } }
  '/api/delete-word-list': { request: z.input<typeof deleteWordListRequest>; response: { removedAudio: number; removedScans: number } }
  '/api/delete-player': { request: z.input<typeof deletePlayerRequest>; response: { removedScans: number; removedPhotos: number } }
  '/api/delete-team': { request: z.input<typeof deleteTeamRequest>; response: { removedFiles: number; removedAccounts: number } }
  '/api/create-team-invitation': { request: z.input<typeof createTeamInvitationRequest>; response: { token: string; expiresAt: string } }
  '/api/accept-team-invitation': { request: z.input<typeof acceptTeamInvitationRequest>; response: { familyId: string } }
  '/api/team-pin': { request: z.input<typeof teamPinRequest>; response: { configured: boolean; verified?: boolean } }
  '/api/debug-scan': { request: z.input<typeof debugScanRequest>; response: LlmResponse<ScanOutput> }
}
