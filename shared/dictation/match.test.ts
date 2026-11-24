import { describe, expect, it } from 'vitest'
import { judgeWord } from './compare.js'
import { matchLines, similarity } from './match.js'

describe('matching lines to words', () => {
  const line = (number: number | null, text: string | null, confidence = 0.9) => ({ number, text, confidence })
  const reads = (expected: string[], lines: ReturnType<typeof line>[]) => matchLines(expected, lines).map((x) => x.read)
  const animals = ['der Hund', 'die Katze', 'das Haus', 'der Zaun']

  it('[SR-31] numbered lines go to their word, in any order', () => {
    expect(reads(['a', 'b', 'c'], [line(2, 'b'), line(1, 'a'), line(3, 'c')])).toEqual(['a', 'b', 'c'])
  })

  it('[SR-31] unnumbered lines fill the free words in order, also mixed with numbered ones', () => {
    expect(reads(['a', 'b', 'c'], [line(null, 'a'), line(2, 'b'), line(null, 'c')])).toEqual(['a', 'b', 'c'])
  })

  it('[SR-31] the surer reading wins a doubled number; the other fills a free word', () => {
    expect(reads(['a', 'b', 'c'], [line(1, 'a'), line(2, 'b?', 0.4), line(2, 'b', 0.9)])).toEqual(['a', 'b', 'b?'])
  })

  it('[SR-31] a word without any line is missing, not illegible', () => {
    const m = matchLines(['a', 'b', 'c'], [line(1, 'a'), line(3, 'c')])
    expect(m[1]).toEqual({ read: null, confidence: 1, found: false })
    expect(judgeWord('die Wiese', m[1].read, m[1].confidence)).toEqual({ verdict: 'wrong', errors: ['missing'] })
  })

  it('[SR-31] a skipped word leaves a gap instead of shifting the later words (no numbers)', () => {
    expect(reads(animals, [line(null, 'der Hund'), line(null, 'das Hous'), line(null, 'der Zaun')])).toEqual(['der Hund', null, 'das Hous', 'der Zaun'])
  })

  it('[SR-31] … also when the child numbered on without the gap', () => {
    expect(reads(animals, [line(1, 'der Hund'), line(2, 'das Hous'), line(3, 'der Zaun')])).toEqual(['der Hund', null, 'das Hous', 'der Zaun'])
  })

  it('[SR-31] badly misspelled words keep their place when nothing is missing', () => {
    expect(reads(animals, [line(null, 'der Hunt'), line(null, 'xyz'), line(null, 'das Hs'), line(null, 'der Zaun')])).toEqual(['der Hunt', 'xyz', 'das Hs', 'der Zaun'])
  })

  it('[SR-31] a word added later at the bottom goes to its number', () => {
    expect(reads(animals, [line(1, 'der Hund'), line(3, 'das Haus'), line(4, 'der Zaun'), line(2, 'die Kaze')])).toEqual(['der Hund', 'die Kaze', 'das Haus', 'der Zaun'])
  })

  it('[SR-31] similarity ignores case and punctuation and is 0 for nothing', () => {
    expect(similarity('Der Hund.', 'der Hund')).toBe(1)
    expect(similarity(null, 'der Hund')).toBe(0)
    expect(similarity('der Hunt', 'der Hund')).toBeCloseTo(7 / 8)
  })
})
