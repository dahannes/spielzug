// Which words come next: mistakes first, then new words, known words now and then (ADR-021).
import type { Verdict } from './compare.js'

/** Words per dictation round. */
export const ROUND_SIZE = 10

export interface RoundResult {
  wordId: string
  verdict: Verdict
}

export interface WordStat {
  attempts: number
  last?: Verdict
  rightInRow: number
}

/** Rounds oldest first. */
export function wordStats(rounds: readonly { results: readonly RoundResult[] | null }[]): Map<string, WordStat> {
  const stats = new Map<string, WordStat>()
  for (const r of rounds) {
    for (const { wordId, verdict } of r.results ?? []) {
      const s = stats.get(wordId) ?? { attempts: 0, rightInRow: 0 }
      stats.set(wordId, {
        attempts: s.attempts + 1,
        last: verdict,
        rightInRow: verdict === 'right' ? s.rightInRow + 1 : 0,
      })
    }
  }
  return stats
}

/** Secure: the last attempt was right. */
export const isSecure = (s: WordStat | undefined) => s?.last === 'right'

function priority(s: WordStat | undefined): number {
  if (!s || s.attempts === 0) return 1
  if (s.last === 'wrong') return 0
  return 1 + s.rightInRow
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRound(wordIds: readonly string[], stats: Map<string, WordStat>, size = 10, random = Math.random): string[] {
  const ranked = shuffle([...wordIds], random).sort((a, b) => priority(stats.get(a)) - priority(stats.get(b)))
  return shuffle(ranked.slice(0, size), random)
}
