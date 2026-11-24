// Berichtigung (SR-25): the wrong words of a checked round, written again from memory.
import type { WordResult } from './grading.js'

interface Checked {
  word_ids: readonly string[]
  results: readonly Pick<WordResult, 'wordId' | 'verdict'>[] | null
}

const wrongIds = (r: Checked) => r.word_ids.filter((id) => r.results?.find((w) => w.wordId === id)?.verdict === 'wrong')

export interface CorrectionState {
  /** Words still to correct: the round's wrong words, or those still wrong in the latest checked Berichtigung. */
  open: string[]
  /** Every wrong word was written right in a Berichtigung. */
  done: boolean
}

/** Where the Berichtigung of a round stands; corrections are that round's, oldest first. */
export function correctionState(round: Checked, corrections: readonly Checked[]): CorrectionState {
  const latest = corrections.filter((c) => c.results).at(-1)
  const open = latest ? wrongIds(latest) : wrongIds(round)
  return { open, done: !!latest && open.length === 0 }
}
