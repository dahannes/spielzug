import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorKind } from '../../../shared/dictation/compare'
import { listWord } from '../../../shared/dictation/words'
import type { WordList, WordResult } from '../dictation/queries'
import { cardStats } from './card'

const right = (wordId: string): WordResult => ({ wordId, read: wordId, confidence: 1, verdict: 'right', errors: [] })
const wrong = (wordId: string, ...errors: ErrorKind[]): WordResult => ({ wordId, read: 'x', confidence: 1, verdict: 'wrong', errors })

let roundNo = 0
const round = (childId: string, checkedAt: string | null, ...results: WordResult[]): WordList['rounds'][number] => ({
  id: `r${++roundNo}`,
  child_id: childId,
  word_ids: results.map((r) => r.wordId),
  results: checkedAt ? results : null,
  created_at: checkedAt ?? '2026-11-10T08:00:00Z',
  checked_at: checkedAt,
  scan_path: null,
  corrects_round_id: null,
})

const list = (id: string, testDate: string | null, rounds: WordList['rounds'], corrections: WordList['rounds'] = []): WordList => ({
  id,
  family_id: 'f1',
  title: `Liste ${id}`,
  discipline: 'word-dictation',
  test_date: testDate,
  grade_min: 3,
  grade_max: 3,
  words: ['a', 'b', 'c'].map((w) => listWord(null, `Wort${w}`, null, null, w)),
  created_at: '2026-11-01T08:00:00Z',
  rounds,
  corrections,
})

describe('player card', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 13, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('[SR-60] a player without rounds, without lists or not saved yet shows dashes', () => {
    const dashes = [['Tore', '0/3'], ['Trefferquote', '–'], ['Serie', '–'], ['Schwerpunkt', '–']]
    expect(cardStats([list('l1', null, [])], { id: 'p1', grade: 3 })).toEqual(dashes)
    expect(cardStats([list('l1', null, [round('p1', '2026-11-13T09:00:00Z', right('a'))])], { id: undefined, grade: 3 })).toEqual(dashes)
    expect(cardStats([], { id: 'p1', grade: 3 })).toEqual([['Tore', '–'], ['Trefferquote', '–'], ['Serie', '–'], ['Schwerpunkt', '–']])
  })

  it('[SR-60] shows Tore, Trefferquote, Serie and Schwerpunkt of the own rounds on the current list', () => {
    const rounds = [
      round('p1', '2026-11-12T09:00:00Z', right('a'), wrong('b', 'ie'), wrong('c', 'ie')),
      round('p1', '2026-11-13T09:00:00Z', right('a'), right('b'), wrong('c', 'case')),
      round('p2', '2026-11-13T10:00:00Z', right('a'), right('b'), right('c')),
      round('p1', null),
    ]
    expect(cardStats([list('l1', '2026-11-20', rounds)], { id: 'p1', grade: 3 })).toEqual([
      ['Tore', '2/3'],
      ['Trefferquote', '50 %'],
      ['Serie', '2 Tage'],
      ['Schwerpunkt', '„ie“'],
    ])
    expect(cardStats([list('l1', '2026-11-20', rounds)], { id: 'p2', grade: 3 })).toEqual([
      ['Tore', '3/3'],
      ['Trefferquote', '100 %'],
      ['Serie', '1 Tag'],
      ['Schwerpunkt', '–'],
    ])
  })

  it('[SR-60] Serie counts rounds on every list; the other stats only the current one', () => {
    const old = list('old', '2026-11-05', [round('p1', '2026-11-12T09:00:00Z', wrong('a', 'case'))])
    const next = list('next', '2026-11-20', [round('p1', '2026-11-13T09:00:00Z', right('a'))])
    expect(cardStats([old, next], { id: 'p1', grade: 3 })).toEqual([
      ['Tore', '1/3'],
      ['Trefferquote', '100 %'],
      ['Serie', '2 Tage'],
      ['Schwerpunkt', '–'],
    ])
  })

  it('[SR-60] the card list is chosen among the lists of the player\'s Klasse only', () => {
    const mine = list('mine', null, [round('p1', '2026-11-12T09:00:00Z', right('a'), right('b'))])
    const younger = { ...list('younger', null, [round('p1', '2026-11-13T09:00:00Z', wrong('a', 'ie'))]), grade_min: 2, grade_max: 2, created_at: '2026-11-10T08:00:00Z' }
    expect(cardStats([mine, younger], { id: 'p1', grade: 3 })).toEqual([
      ['Tore', '2/3'],
      ['Trefferquote', '100 %'],
      ['Serie', '2 Tage'],
      ['Schwerpunkt', '–'],
    ])
    // the Klasse-2 player gets the other list
    expect(cardStats([mine, younger], { id: 'p1', grade: 2 })[0]).toEqual(['Tore', '0/3'])
  })

  it('[SR-25][SR-61] a Berichtigung keeps the Serie going but changes no other stat', () => {
    const dictation = round('p1', '2026-11-12T09:00:00Z', wrong('a', 'ie'))
    const correction = { ...round('p1', '2026-11-13T09:00:00Z', right('a')), corrects_round_id: dictation.id }
    expect(cardStats([list('l1', null, [dictation], [correction])], { id: 'p1', grade: 3 })).toEqual([
      ['Tore', '0/3'],
      ['Trefferquote', '0 %'],
      ['Serie', '2 Tage'],
      ['Schwerpunkt', '„ie“'],
    ])
  })
})
