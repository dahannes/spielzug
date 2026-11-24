import { describe, expect, it } from 'vitest'
import { errorKinds, isUnsure, judgeWord, letterDiff } from './compare.js'

describe('checking a word', () => {
  it('[SR-32] right, wrong with mistake kinds; illegible counts as a mistake', () => {
    expect(judgeWord('die Wiese', 'die Wiese.', 0.2)).toEqual({ verdict: 'right', errors: [] })
    expect(judgeWord('die Wiese', 'die Wise', 0.9)).toEqual({ verdict: 'wrong', errors: ['ie'] })
    expect(judgeWord('die Wiese', 'die Wise', 0.4)).toEqual({ verdict: 'wrong', errors: ['ie'] })
    expect(judgeWord('die Wiese', 'die Wise', 0.2)).toEqual({ verdict: 'wrong', errors: ['illegible'] })
    expect(judgeWord('die Wiese', null, 0.1)).toEqual({ verdict: 'wrong', errors: ['illegible'] })
    expect(judgeWord('die Wiese', null, 0.95)).toEqual({ verdict: 'wrong', errors: ['missing'] })
  })

  it('[SR-32] names typical German spelling mistakes', () => {
    expect(errorKinds('der Tisch', 'der tisch')).toEqual(['case'])
    expect(errorKinds('der Tisch', 'die Tisch')).toEqual(['article'])
    expect(errorKinds('süß', 'süss')).toEqual(['s-sound'])
    expect(errorKinds('die Tür', 'die Tur')).toEqual(['umlaut'])
    expect(errorKinds('der Teller', 'der Teler')).toEqual(['double'])
    expect(errorKinds('der Vater', 'der Vata')).toEqual(['letters'])
  })

  it('[SR-33] marks missing and extra letters', () => {
    expect(letterDiff('Wiese', 'Wise')).toEqual([
      { text: 'Wi', kind: 'same' },
      { text: 'e', kind: 'missing' },
      { text: 'se', kind: 'same' },
    ])
  })
})

describe('unsure readings', () => {
  it('[SR-34] flags graded readings with low confidence, not clear or illegible ones', () => {
    expect(isUnsure({ read: 'der Teler', confidence: 0.4 })).toBe(true)
    expect(isUnsure({ read: 'der Teller', confidence: 0.7 })).toBe(false)
    expect(isUnsure({ read: 'xx', confidence: 0.2 })).toBe(false) // illegible already
    expect(isUnsure({ read: null, confidence: 0.4 })).toBe(false) // nothing written
  })
})
