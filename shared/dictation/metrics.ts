// Player-card metrics: per list for Wort-Diktat (SR-60), the streak across training types (SR-61).
import type { ErrorKind } from './compare.js'
import type { WordResult } from './grading.js'
import { isSecure, wordStats } from './pick.js'
import { daysUntil } from './schedule.js'

/** A round as the metrics see it; rounds are passed oldest first. */
export interface GradedRound {
  results: readonly WordResult[] | null
}

const graded = <R extends GradedRound>(rounds: readonly R[]) => rounds.filter((r) => r.results)

/** Tore: words of the list whose latest attempt was right. */
export function goals(wordIds: readonly string[], rounds: readonly GradedRound[]): number {
  const stats = wordStats(rounds)
  return wordIds.filter((id) => isSecure(stats.get(id))).length
}

export type ListStatus = 'active' | 'new' | 'done'

/** A list for one player: new while no word is secure (rounds or not), done when every word is, else in progress. */
export function listStatus(wordIds: readonly string[], rounds: readonly GradedRound[]): ListStatus {
  const secure = goals(wordIds, rounds)
  if (secure === 0) return 'new'
  return secure === wordIds.length ? 'done' : 'active'
}

/** Trefferquote: right ÷ all words over the latest three graded rounds; null without any. */
export function hitRate(rounds: readonly GradedRound[]): number | null {
  const results = graded(rounds)
    .slice(-3)
    .flatMap((r) => r.results ?? [])
  if (results.length === 0) return null
  return results.filter((r) => r.verdict === 'right').length / results.length
}

/** Mistake kinds a child can practise; "missing", "illegible" and plain "letters" say nothing about spelling. */
const FOCUS_KINDS: readonly ErrorKind[] = ['ie', 'case', 'article', 'double', 's-sound', 'umlaut', 'h']

/** Schwerpunkt: the most frequent mistake kind over the latest five graded rounds; null without one. */
export function focus(rounds: readonly GradedRound[]): ErrorKind | null {
  const counts = new Map<ErrorKind, number>()
  for (const r of graded(rounds).slice(-5)) {
    for (const kind of (r.results ?? []).flatMap((w) => w.errors)) {
      if (FOCUS_KINDS.includes(kind)) counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
  }
  let best: ErrorKind | null = null
  for (const kind of FOCUS_KINDS) if ((counts.get(kind) ?? 0) > (best ? counts.get(best)! : 0)) best = kind
  return best
}

/**
 * The bar's segments (wireframe T11): for every word that is secure now, the round in which it last
 * became secure. Counts per round id add up to goals(); words lost and won again belong to the
 * later round, so an old round's share can shrink over time.
 */
export function goalsByRound(wordIds: readonly string[], rounds: readonly (GradedRound & { id: string })[]): Map<string, number> {
  const since = new Map<string, string>() // word → round of its current run of right answers
  const last = new Map<string, WordResult['verdict']>()
  for (const round of rounds) {
    for (const { wordId, verdict } of round.results ?? []) {
      if (verdict === 'right' && last.get(wordId) !== 'right') since.set(wordId, round.id)
      last.set(wordId, verdict)
    }
  }
  const counts = new Map<string, number>()
  for (const id of wordIds) {
    const round = last.get(id) === 'right' ? since.get(id) : undefined
    if (round) counts.set(round, (counts.get(round) ?? 0) + 1)
  }
  return counts
}

/** Words that this round made secure (their attempt before was missing or wrong). */
export function newGoals(before: readonly GradedRound[], round: GradedRound): string[] {
  const stats = wordStats(before)
  return (round.results ?? []).filter((r) => r.verdict === 'right' && !isSecure(stats.get(r.wordId))).map((r) => r.wordId)
}

/** A calendar day in local time, as a key. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

/**
 * Serie: consecutive calendar days (local time) with at least one graded round, counted back from
 * today. A day without a round yet does not break the streak until it is over.
 */
export function streak(checkedAt: readonly (string | null)[], today: Date = new Date()): number {
  const days = new Set(checkedAt.filter((t): t is string => !!t).map((t) => dayKey(new Date(t))))
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (!days.has(dayKey(day))) day.setDate(day.getDate() - 1)
  let count = 0
  while (days.has(dayKey(day))) {
    count++
    day.setDate(day.getDate() - 1)
  }
  return count
}

/** The list on the player card: the next test (today or later), else the newest list. */
export function currentList<L extends { test_date: string | null; created_at: string }>(lists: readonly L[], today: Date = new Date()): L | undefined {
  const upcoming = lists
    .map((l) => ({ l, days: daysUntil(l.test_date, today) }))
    .filter((x): x is { l: L; days: number } => x.days !== null && x.days >= 0)
    .sort((a, b) => a.days - b.days)
  return upcoming[0]?.l ?? [...lists].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
}
