import { describe, expect, it } from 'vitest'
import { gradeRound } from './grading.js'
import { listWord } from './words.js'

describe('grading a round', () => {
  const words = [listWord('die', 'Wiese', null, null, 'w1'), listWord(null, 'süß', null, null, 'w2'), listWord('der', 'Teller', null, null, 'w3')]

  it('[SR-32][SR-33] gives every dictated word its verdict, by word id', () => {
    const results = gradeRound(words, [
      { number: 1, text: 'die Wiese', confidence: 0.9 },
      { number: 3, text: 'der Teler', confidence: 0.9 },
    ])
    expect(results.map((r) => [r.wordId, r.verdict, r.errors])).toEqual([
      ['w1', 'right', []],
      ['w2', 'wrong', ['missing']],
      ['w3', 'wrong', ['double']],
    ])
  })

  it('[SR-32] an unreadable line is a mistake "illegible", not a guess', () => {
    const [first] = gradeRound(words.slice(0, 1), [{ number: 1, text: 'die Wxse', confidence: 0.2 }])
    expect(first).toMatchObject({ verdict: 'wrong', errors: ['illegible'], read: 'die Wxse' })
  })
})
