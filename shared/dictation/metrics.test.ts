import { describe, expect, it } from 'vitest'
import type { ErrorKind } from './compare.js'
import type { WordResult } from './grading.js'
import { currentList, focus, goals, goalsByRound, hitRate, listStatus, newGoals, streak } from './metrics.js'

const right = (wordId: string): WordResult => ({ wordId, read: wordId, confidence: 1, verdict: 'right', errors: [] })
const wrong = (wordId: string, ...errors: ErrorKind[]): WordResult => ({ wordId, read: 'x', confidence: 1, verdict: 'wrong', errors })
const round = (...results: WordResult[]) => ({ results })
const open = { results: null }

describe('Wort-Diktat metrics', () => {
  it('[SR-60] Tore count words whose latest attempt was right', () => {
    const rounds = [round(right('a'), wrong('b')), round(wrong('a'), right('b'), right('c')), open]
    expect(goals(['a', 'b', 'c', 'd'], rounds)).toBe(2)
    expect(goals(['a'], [])).toBe(0)
  })

  it('[SR-14] a list is new while no word is secure, done when every word is, otherwise in progress', () => {
    expect(listStatus(['a', 'b'], [])).toBe('new')
    expect(listStatus(['a', 'b'], [open])).toBe('new')
    expect(listStatus(['a', 'b'], [round(wrong('a'), wrong('b'))])).toBe('new')
    expect(listStatus(['a', 'b'], [round(right('a'), wrong('b'))])).toBe('active')
    expect(listStatus(['a', 'b'], [round(right('a')), round(right('b'))])).toBe('done')
  })

  it('[SR-60] Trefferquote uses the latest three graded rounds; open rounds and empty histories do not count', () => {
    const rounds = [round(wrong('a'), wrong('b')), round(right('a')), round(right('a'), wrong('b')), open, round(right('a'), right('b'))]
    expect(hitRate(rounds)).toBe(4 / 5)
    expect(hitRate([round(wrong('a'))])).toBe(0)
    expect(hitRate([open])).toBeNull()
    expect(hitRate([])).toBeNull()
  })

  it('[SR-60] Schwerpunkt is the most frequent spelling mistake over the latest five graded rounds', () => {
    const old = round(wrong('a', 'case'), wrong('b', 'case'), wrong('c', 'case'))
    const recent = [round(wrong('a', 'ie')), round(wrong('a', 'ie', 'case')), round(right('a')), round(wrong('b', 'ie')), round(wrong('c', 'missing'), wrong('d', 'illegible'))]
    expect(focus([old, ...recent])).toBe('ie')
    expect(focus([round(wrong('a', 'missing'), wrong('b', 'letters'))])).toBeNull()
    expect(focus([])).toBeNull()
  })

  it('[SR-34] the bar gives each secure word to the round it last became secure in; the parts add up to the Tore', () => {
    const rounds = [
      { id: 'r1', results: [right('a'), right('b'), wrong('c')] },
      { id: 'r2', results: [wrong('a'), right('c')] },
      { id: 'r3', results: null },
      { id: 'r4', results: [right('a'), right('b'), wrong('d')] },
    ]
    const parts = goalsByRound(['a', 'b', 'c', 'd'], rounds)
    expect(Object.fromEntries(parts)).toEqual({ r1: 1, r2: 1, r4: 1 }) // b stays with r1, a moved to r4
    expect([...parts.values()].reduce((x, y) => x + y, 0)).toBe(goals(['a', 'b', 'c', 'd'], rounds))
    expect(goalsByRound(['a'], []).size).toBe(0)
  })

  it('[SR-60] a round scores new Tore only for words that were not secure before', () => {
    const before = [round(right('a'), wrong('b'))]
    expect(newGoals(before, round(right('a'), right('b'), right('c'), wrong('d')))).toEqual(['b', 'c'])
  })

  it('[SR-60] the card shows the next test, else the newest list', () => {
    const today = new Date(2026, 10, 12, 18)
    const lists = [
      { id: 'past', test_date: '2026-11-10', created_at: '2026-11-01T00:00:00Z' },
      { id: 'later', test_date: '2026-11-20', created_at: '2026-11-02T00:00:00Z' },
      { id: 'next', test_date: '2026-11-12', created_at: '2026-11-03T00:00:00Z' },
      { id: 'newest', test_date: null, created_at: '2026-11-04T00:00:00Z' },
    ]
    expect(currentList(lists, today)?.id).toBe('next')
    expect(currentList([lists[0], lists[3]], today)?.id).toBe('newest')
    expect(currentList([], today)).toBeUndefined()
  })
})

describe('Serie', () => {
  const today = new Date(2026, 10, 12, 18)
  const at = (day: number, hour = 17) => new Date(2026, 10, day, hour).toISOString()

  it('[SR-61] counts consecutive days with a graded round, today included', () => {
    expect(streak([at(12), at(11), at(11, 9), at(10), at(8)], today)).toBe(3)
  })

  it('[SR-61] a day without a round yet keeps yesterday’s streak; a gap ends it', () => {
    expect(streak([at(11), at(10)], today)).toBe(2)
    expect(streak([at(10)], today)).toBe(0)
    expect(streak([null], today)).toBe(0)
  })

  it('[SR-61] uses local calendar days, not UTC', () => {
    expect(streak([new Date(2026, 10, 12, 0, 30).toISOString(), new Date(2026, 10, 11, 23, 30).toISOString()], today)).toBe(2)
  })
})
