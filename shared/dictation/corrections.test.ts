import { describe, expect, it } from 'vitest'
import { correctionState } from './corrections.js'

const right = (wordId: string) => ({ wordId, verdict: 'right' as const })
const wrong = (wordId: string) => ({ wordId, verdict: 'wrong' as const })

describe('Berichtigung', () => {
  const round = { word_ids: ['a', 'b', 'c'], results: [right('a'), wrong('b'), wrong('c')] }

  it('[SR-25] starts with the wrong words of the round, in dictation order', () => {
    expect(correctionState(round, [])).toEqual({ open: ['b', 'c'], done: false })
  })

  it('[SR-25] an unfinished Berichtigung changes nothing', () => {
    expect(correctionState(round, [{ word_ids: ['b', 'c'], results: null }])).toEqual({ open: ['b', 'c'], done: false })
  })

  it('[SR-25] the next one takes only the words still wrong; done when all are right', () => {
    const first = { word_ids: ['b', 'c'], results: [right('b'), wrong('c')] }
    expect(correctionState(round, [first])).toEqual({ open: ['c'], done: false })
    expect(correctionState(round, [first, { word_ids: ['c'], results: [right('c')] }])).toEqual({ open: [], done: true })
  })

  it('[SR-25] a round without mistakes needs none', () => {
    expect(correctionState({ word_ids: ['a'], results: [right('a')] }, [])).toEqual({ open: [], done: false })
  })
})
