import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { AUDIO_BUCKET, audioPath } from '../../../shared/dictation/audio'
import { correctionState } from '../../../shared/dictation/corrections'
import { gradeRound, type WordResult } from '../../../shared/dictation/grading'
import { SCAN_BUCKET, scanPath } from '../../../shared/dictation/scans'
import { pickRound, ROUND_SIZE, wordStats } from '../../../shared/dictation/pick'
import { listWord, uniqueWords, vocabWord, type ListWord } from '../../../shared/dictation/words'
import type { Json } from '../../../shared/database.types'
import { languageOf, type GradeRange, type ListDiscipline } from '../../../shared/subjects'
import { paths } from '../../app/paths'
import { postApi, toBase64 } from '../../lib/api'
import { supabase } from '../../lib/supabase'

export type { WordResult }

/** Query keys of this feature; invalidating `keys.lists()` refreshes every list view. */
const keys = {
  lists: (familyId?: string) => (familyId ? (['word-lists', familyId] as const) : (['word-lists'] as const)),
  round: (roundId?: string) => ['dictation-round', roundId] as const,
  audio: (roundId?: string) => ['dictation-audio', roundId] as const,
  scan: (path?: string) => ['dictation-scan', path] as const,
}

/**
 * Makes the spoken audio of a list on the server (Polly). Never fails the caller: without audio
 * the device voice reads the words. With a timeout the caller does not wait for long lists.
 */
async function prepareAudio(listId: string, timeoutMs?: number): Promise<void> {
  try {
    await postApi('/api/prepare-audio', { listId }, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined)
  } catch (error) {
    console.warn('prepare-audio failed', error)
  }
}

function useInvalidateLists() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: keys.lists() })
}

// ---- word lists -------------------------------------------------------------

/** All lists of the family with their rounds' results – small for a family, so loaded at once. */
const wordListsQuery = (familyId: string | undefined) =>
  queryOptions({
    queryKey: keys.lists(familyId),
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('word_lists')
        .select('id, family_id, title, discipline, test_date, grade_min, grade_max, words, created_at, dictation_rounds(id, child_id, word_ids, results, created_at, checked_at, scan_path, corrects_round_id)')
        .eq('family_id', familyId!)
        .order('created_at', { ascending: false })
        .order('created_at', { referencedTable: 'dictation_rounds' })
      if (error) throw error
      return data.map(({ dictation_rounds, ...l }) => {
        const all = dictation_rounds as {
          id: string
          child_id: string
          word_ids: string[]
          results: WordResult[] | null
          created_at: string
          checked_at: string | null
          scan_path: string | null
          corrects_round_id: string | null
        }[]
        return {
          ...l,
          discipline: l.discipline as ListDiscipline,
          words: l.words as unknown as ListWord[],
          // Dictations only: every metric and the word choice build on them (SR-25).
          rounds: all.filter((r) => !r.corrects_round_id),
          corrections: all.filter((r) => r.corrects_round_id),
        }
      })
    },
  })

export function useWordLists(familyId: string | undefined) {
  return useQuery(wordListsQuery(familyId))
}

export type WordList = NonNullable<ReturnType<typeof useWordLists>['data']>[number]

/** The grade range a list is meant for (Klasse von–bis). */
export const gradesOf = (list: WordList): GradeRange => ({ min: list.grade_min, max: list.grade_max })

/** The rounds of one child: progress and word choice are per child (SR-04). */
export const roundsOf = (list: WordList, childId: string | undefined) => list.rounds.filter((r) => r.child_id === childId)

/** The Berichtigungen of one round, oldest first. */
export const correctionsOf = (list: WordList, roundId: string) => list.corrections.filter((r) => r.corrects_round_id === roundId)

/** One list, taken from the lists query (same cache, no extra request). */
export function useWordList(familyId: string | undefined, listId: string | undefined) {
  return useQuery({ ...wordListsQuery(familyId), select: (lists) => lists.find((l) => l.id === listId) })
}

/** Reads a photographed word list (or vocabulary list); the parents check it before saving. */
export function useReadWordList(discipline: ListDiscipline) {
  return useMutation({
    mutationFn: async (photo: Blob) => {
      if (discipline === 'vocabulary') {
        const v = await postApi('/api/read-vocab-list', { image: await toBase64(photo) })
        return { title: v.output.title, words: uniqueWords(v.output.words.map((w) => vocabWord(w.english, w.german))) }
      }
      const r = await postApi('/api/read-word-list', { image: await toBase64(photo) })
      return { title: r.output.title, words: uniqueWords(r.output.words.map((w) => listWord(w.article, w.word, w.form, w.sentence))) }
    },
  })
}

export function useSaveWordList() {
  const invalidate = useInvalidateLists()
  return useMutation({
    mutationFn: async (v: { familyId: string; id?: string; discipline: ListDiscipline; title: string; testDate: string | null; grades: GradeRange; words: ListWord[] }) => {
      const row = {
        family_id: v.familyId,
        discipline: v.discipline,
        title: v.title,
        test_date: v.testDate,
        grade_min: v.grades.min,
        grade_max: v.grades.max,
        words: v.words as unknown as NonNullable<Json>,
      }
      const { data, error } = v.id
        ? await supabase.from('word_lists').update(row).eq('id', v.id).select('id').single()
        : await supabase.from('word_lists').insert(row).select('id').single()
      if (error) throw error
      // In the background: saving does not wait for Polly; rounds start fine without audio.
      void prepareAudio(data.id)
      return data.id
    },
    onSuccess: invalidate,
  })
}

/** Deletes the list with its rounds and, on the server, its spoken audio. */
export function useDeleteWordList() {
  const invalidate = useInvalidateLists()
  return useMutation({
    mutationFn: (listId: string) => postApi('/api/delete-word-list', { listId }),
    onSuccess: invalidate,
  })
}

/** Progress of one child back to zero: deletes its rounds of the list and their photos; list and other children stay. */
export function useResetProgress() {
  const invalidate = useInvalidateLists()
  return useMutation({
    mutationFn: async ({ listId, childId }: { listId: string; childId: string }) => {
      const { data, error } = await supabase.from('dictation_rounds').delete().eq('list_id', listId).eq('child_id', childId).select('scan_path')
      if (error) throw error
      const scans = data.flatMap((r) => (r.scan_path ? [r.scan_path] : []))
      if (scans.length) {
        // The rounds are gone either way; a photo left behind is only unreachable, so just log it.
        const removed = await supabase.storage.from(SCAN_BUCKET).remove(scans)
        if (removed.error) console.warn('scan photos not removed', removed.error)
      }
    },
    onSuccess: invalidate,
  })
}

// ---- rounds -----------------------------------------------------------------

/**
 * Starts a round of the list for a child (its mistakes first, then new words) and opens it. An
 * unfinished newest round is opened again instead: same words, no abandoned rounds piling up, and
 * backing out does not buy easier words.
 */
export function useStartRound() {
  const invalidate = useInvalidateLists()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async ({ list, childId }: { list: WordList; childId: string }) => {
      const newest = roundsOf(list, childId).at(-1)
      if (newest && !newest.results) return newest.id
      // New or edited words: wait a little for their audio, then start anyway.
      await prepareAudio(list.id, 8000)
      const ids = pickRound(
        list.words.map((w) => w.id),
        wordStats(roundsOf(list, childId)),
        ROUND_SIZE,
      )
      const { data, error } = await supabase
        .from('dictation_rounds')
        .insert({ family_id: list.family_id, child_id: childId, list_id: list.id, word_ids: ids })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: async (roundId) => {
      await invalidate()
      navigate(paths.round(roundId))
    },
  })
}

/**
 * Starts the Berichtigung of a checked round with the words still to correct (SR-25) and opens it;
 * an unfinished one is opened again.
 */
export function useStartCorrection() {
  const invalidate = useInvalidateLists()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async ({ list, round }: { list: WordList; round: WordList['rounds'][number] }) => {
      const corrections = correctionsOf(list, round.id)
      const newest = corrections.at(-1)
      if (newest && !newest.results) return newest.id
      const { open } = correctionState(round, corrections)
      const { data, error } = await supabase
        .from('dictation_rounds')
        .insert({ family_id: list.family_id, child_id: round.child_id, list_id: list.id, word_ids: open, corrects_round_id: round.id })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: async (roundId) => {
      await invalidate()
      navigate(paths.round(roundId))
    },
  })
}

export function useRound(roundId: string | undefined) {
  return useQuery({
    queryKey: keys.round(roundId),
    enabled: !!roundId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dictation_rounds')
        .select('id, family_id, child_id, list_id, word_ids, results, created_at, started_at, finished_at, checked_at, scan_path, corrects_round_id, word_lists(title, words, discipline), children(name, color)')
        .eq('id', roundId!)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const all = (data.word_lists?.words ?? []) as unknown as ListWord[]
      const words = data.word_ids.flatMap((id) => all.filter((w) => w.id === id))
      const discipline = (data.word_lists?.discipline ?? 'word-dictation') as ListDiscipline
      return { ...data, words, discipline, results: data.results as unknown as WordResult[] | null }
    },
  })
}

export type Round = NonNullable<ReturnType<typeof useRound>['data']>

/**
 * Training time (SR-61): kickoff keeps the first start, the final whistle the latest finish.
 * Tracked only; a failed write never stops the dictation.
 */
export function useTrackRound() {
  return useMutation({
    mutationFn: async ({ roundId, event }: { roundId: string; event: 'kickoff' | 'whistle' }) => {
      const now = new Date().toISOString()
      const { error } =
        event === 'kickoff'
          ? await supabase.from('dictation_rounds').update({ started_at: now }).eq('id', roundId).is('started_at', null)
          : await supabase.from('dictation_rounds').update({ finished_at: now }).eq('id', roundId).not('started_at', 'is', null)
      if (error) throw error
    },
    onError: (error) => console.warn('round timing not saved', error),
  })
}

/** Signed URLs of the spoken words (null where no audio exists yet). */
export function useRoundAudio(round: Round) {
  return useQuery({
    queryKey: keys.audio(round.id),
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const paths = round.words.map((w) => audioPath(round.family_id, round.list_id, w))
      const { data } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrls(paths, 3600)
      return new Map(round.words.map((w, i) => [w.id, (data?.[i] && !data[i].error && data[i].signedUrl) || null]))
    },
  })
}

/** Signed URL of a round's photo (null without one). */
export function useScanUrl(scanPath: string | null) {
  return useQuery({
    queryKey: keys.scan(scanPath ?? undefined),
    enabled: !!scanPath,
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(SCAN_BUCKET).createSignedUrl(scanPath!, 3600)
      if (error) throw error
      return data.signedUrl
    },
  })
}

/** Reads the sheet blind, compares in code and stores the results with the photo (SR-34). */
export function useCheckRound() {
  const queryClient = useQueryClient()
  const invalidateLists = useInvalidateLists()
  return useMutation({
    mutationFn: async ({ round, photo }: { round: Round; photo: Blob }) => {
      const r = await postApi('/api/read-dictation', { image: await toBase64(photo), count: round.words.length, language: languageOf(round.discipline) })
      const results = gradeRound(round.words, r.output.lines)
      // The photo is a bonus for the report: without it the round still counts.
      const path = scanPath(round.family_id, round.list_id, round.id)
      const upload = await supabase.storage.from(SCAN_BUCKET).upload(path, photo, { contentType: 'image/jpeg', upsert: true })
      if (upload.error) console.warn('scan photo not stored', upload.error)
      const { error } = await supabase
        .from('dictation_rounds')
        .update({ results: results as unknown as Json, read_lines: r.output.lines as unknown as Json, checked_at: new Date().toISOString(), scan_path: upload.error ? null : path })
        .eq('id', round.id)
      if (error) throw error
      return results
    },
    onSuccess: async (_d, { round }) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: keys.round(round.id) }), invalidateLists()])
    },
  })
}
