// Liga (SR-63, ADR-042): a player climbs from the Kreisliga (one star) to the Bundesliga (five
// stars) by practising, and wears the jerseys (clubs) whose rarity is not above their league.
// Practice counts, never speed or a comparison with other players; mistakes cost nothing.
import { correctionState } from './dictation/corrections.js'
import type { WordResult } from './dictation/grading.js'
import { dayKey } from './dictation/metrics.js'

export type LeagueLevel = 1 | 2 | 3 | 4 | 5

/** What a player has done so far: only grows while their rounds exist. */
export interface Career {
  /** Graded dictations (Wort-Diktat or Vokabeln), Berichtigungen not included. */
  games: number
  /** Calendar days with at least one graded round, Berichtigungen included (like the Serie). */
  days: number
  /** Karriere-Tore: different words (per list) that were right at least once in a dictation. */
  goals: number
  /** Dictations whose Berichtigung was finished (every wrong word written right). */
  corrections: number
}

export interface League {
  level: LeagueLevel
  name: string
  /** All of them are needed to reach this league. */
  needs: Career
}

/** The goals per league; the numbers are a first guess, to be tuned with real rounds. */
export const LEAGUES: readonly League[] = [
  { level: 1, name: 'Kreisliga', needs: { games: 0, days: 0, goals: 0, corrections: 0 } },
  { level: 2, name: 'Bezirksliga', needs: { games: 3, days: 2, goals: 0, corrections: 0 } },
  { level: 3, name: 'Landesliga', needs: { games: 10, days: 5, goals: 40, corrections: 1 } },
  { level: 4, name: 'Oberliga', needs: { games: 25, days: 12, goals: 100, corrections: 1 } },
  { level: 5, name: 'Bundesliga', needs: { games: 50, days: 25, goals: 200, corrections: 1 } },
]

/** How a goal is shown to the child, in the order of `Career`. */
export const GOAL_LABEL: Record<keyof Career, (n: number) => string> = {
  games: (n) => (n === 1 ? '1 Spiel' : `${n} Spiele`),
  days: (n) => (n === 1 ? '1 Trainingstag' : `${n} Trainingstage`),
  goals: (n) => (n === 1 ? '1 Karriere-Tor' : `${n} Karriere-Tore`),
  corrections: (n) => (n === 1 ? '1 Berichtigung geschafft' : `${n} Berichtigungen geschafft`),
}

export const leagueOf = (level: number): League => LEAGUES[Math.min(Math.max(Math.round(level), 1), LEAGUES.length) - 1]

interface CareerRound {
  word_ids: readonly string[]
  results: readonly Pick<WordResult, 'wordId' | 'verdict'>[] | null
  checked_at: string | null
}

/** One list with one player's dictations and Berichtigungen (oldest first). */
interface CareerList<R extends CareerRound & { id: string }> {
  id: string
  rounds: readonly R[]
  corrections: readonly (R & { corrects_round_id: string | null })[]
}

/** A player's career over all lists; pass only that player's rounds. */
export function career<R extends CareerRound & { id: string }>(lists: readonly CareerList<R>[]): Career {
  const days = new Set<string>()
  const words = new Set<string>()
  let games = 0
  let corrections = 0
  for (const list of lists) {
    for (const round of list.rounds) {
      if (!round.results) continue
      games++
      if (round.checked_at) days.add(dayKey(new Date(round.checked_at)))
      for (const r of round.results) if (r.verdict === 'right') words.add(`${list.id}:${r.wordId}`)
      if (correctionState(round, list.corrections.filter((c) => c.corrects_round_id === round.id)).done) corrections++
    }
    for (const c of list.corrections) if (c.results && c.checked_at) days.add(dayKey(new Date(c.checked_at)))
  }
  return { games, days: days.size, goals: words.size, corrections }
}

const meets = (have: Career, needs: Career) => (Object.keys(needs) as (keyof Career)[]).every((k) => have[k] >= needs[k])

/** The highest league whose goals are all met. */
export function earnedLeague(have: Career): LeagueLevel {
  return [...LEAGUES].reverse().find((l) => meets(have, l.needs))!.level
}

export interface GoalProgress {
  goal: keyof Career
  have: number
  need: number
}

/** The goals of the league after `level` with what is done; null in the Bundesliga. */
export function nextGoals(level: number, have: Career): { league: League; goals: GoalProgress[] } | null {
  const next = LEAGUES[leagueOf(level).level]
  if (!next) return null
  const goals = (Object.keys(next.needs) as (keyof Career)[]).filter((k) => next.needs[k] > 0).map((goal) => ({ goal, have: Math.min(have[goal], next.needs[goal]), need: next.needs[goal] }))
  return { league: next, goals }
}
