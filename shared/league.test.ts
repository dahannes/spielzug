import { describe, expect, it } from 'vitest'
import { career, earnedLeague, LEAGUES, leagueOf, nextGoals, type Career } from './league.js'

type Verdict = 'right' | 'wrong'
let n = 0
const round = (day: number, verdicts: Record<string, Verdict>, correctsRoundId: string | null = null) => ({
  id: `r${++n}`,
  word_ids: Object.keys(verdicts),
  results: Object.entries(verdicts).map(([wordId, verdict]) => ({ wordId, verdict })),
  checked_at: new Date(2026, 10, day, 15).toISOString(),
  corrects_round_id: correctsRoundId,
})
const open = { ...round(1, {}), results: null, checked_at: null }
const none: Career = { games: 0, days: 0, goals: 0, corrections: 0 }

describe('Liga', () => {
  it('[SR-63] counts games, training days, Karriere-Tore and finished Berichtigungen over all lists', () => {
    const first = round(1, { a: 'right', b: 'wrong' })
    const fix1 = round(2, { b: 'wrong' }, first.id)
    const fix2 = round(2, { b: 'right' }, first.id)
    const second = round(3, { a: 'wrong', b: 'wrong' })
    const other = round(3, { a: 'right' })
    const have = career([
      { id: 'l1', rounds: [first, second, open], corrections: [fix1, fix2] },
      { id: 'l2', rounds: [other], corrections: [] },
    ])
    // a Berichtigung counts for the days, not as a game and not for Tore; a lost Tor stays in the career;
    // the same word id in another list is another word
    expect(have).toEqual({ games: 3, days: 3, goals: 2, corrections: 1 })
    expect(career([])).toEqual(none)
  })

  it('[SR-63] the league is the highest one whose goals are all met', () => {
    expect(earnedLeague(none)).toBe(1)
    expect(earnedLeague({ games: 3, days: 1, goals: 0, corrections: 0 })).toBe(1)
    expect(earnedLeague({ games: 3, days: 2, goals: 0, corrections: 0 })).toBe(2)
    expect(earnedLeague({ games: 99, days: 99, goals: 999, corrections: 0 })).toBe(2)
    expect(earnedLeague({ games: 10, days: 5, goals: 40, corrections: 1 })).toBe(3)
    expect(earnedLeague({ games: 50, days: 25, goals: 200, corrections: 1 })).toBe(5)
  })

  it('[SR-63] goals only grow from league to league', () => {
    for (const [i, league] of LEAGUES.entries()) {
      expect(league.level).toBe(i + 1)
      if (i > 0) for (const k of Object.keys(league.needs) as (keyof Career)[]) expect(league.needs[k]).toBeGreaterThanOrEqual(LEAGUES[i - 1].needs[k])
    }
  })

  it('[SR-63] shows the next league with the goals it needs, capped at what is needed', () => {
    expect(nextGoals(1, { games: 5, days: 1, goals: 0, corrections: 0 })).toEqual({
      league: LEAGUES[1],
      goals: [
        { goal: 'games', have: 3, need: 3 },
        { goal: 'days', have: 1, need: 2 },
      ],
    })
    expect(nextGoals(2, none)?.goals.map((g) => g.goal)).toEqual(['games', 'days', 'goals', 'corrections'])
    expect(nextGoals(5, none)).toBeNull()
    expect(leagueOf(0).name).toBe('Kreisliga')
    expect(leagueOf(7).name).toBe('Bundesliga')
  })
})
