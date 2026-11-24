import { describe, expect, it } from 'vitest'
import { isSecure, pickRound, wordStats } from './pick.js'

describe('picking words', () => {
  const rounds = [
    { results: [{ wordId: 'a', verdict: 'right' as const }, { wordId: 'b', verdict: 'wrong' as const }] },
    { results: [{ wordId: 'a', verdict: 'right' as const }] },
  ]

  it('[SR-20] tracks secure words: the last attempt was right', () => {
    const stats = wordStats(rounds)
    expect(isSecure(stats.get('a'))).toBe(true)
    expect(stats.get('a')).toMatchObject({ attempts: 2, rightInRow: 2 })
    expect(isSecure(stats.get('b'))).toBe(false)
    expect(isSecure(stats.get('c'))).toBe(false)
  })

  it('[SR-20] mistakes first, then new words, secure words last', () => {
    const picked = pickRound(['a', 'b', 'c', 'd'], wordStats(rounds), 3, () => 0.5)
    expect(picked.toSorted()).toEqual(['b', 'c', 'd'])
  })
})
