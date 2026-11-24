// Grading a dictation sheet: the model's lines (read blind) against the dictated words (ADR-021).
import { judgeWord, type ErrorKind, type Verdict } from './compare.js'
import { matchLines, type ReadLine } from './match.js'
import { expectedText, type ListWord } from './words.js'

/** One word of a checked round, as stored in dictation_rounds.results. */
export interface WordResult {
  wordId: string
  read: string | null
  confidence: number
  verdict: Verdict
  errors: ErrorKind[]
}

/** Words in dictation order; each gets its line on the sheet and a verdict. */
export function gradeRound(words: readonly ListWord[], lines: readonly ReadLine[]): WordResult[] {
  const matches = matchLines(words.map(expectedText), lines)
  return words.map((w, i) => {
    const { read, confidence } = matches[i]
    return { wordId: w.id, read, confidence, ...judgeWord(expectedText(w), read, confidence) }
  })
}
