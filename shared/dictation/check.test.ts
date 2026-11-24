import { describe, expect, it } from 'vitest'
import { checkItems } from './check.js'

describe('sheet check before the photo', () => {
  const nouns = [{ article: 'der' as const }, { article: null }]
  const verbs = [{ article: null }, { article: null }]

  it('[SR-24] always asks for all numbers and legible letters; nouns only when the round has some', () => {
    expect(checkItems(verbs, null).map((i) => i.text)).toEqual([
      'Alle Nummern da, von 1 bis 2?',
      'Jeder Buchstabe gut lesbar? Sonst durchstreichen und daneben neu schreiben.',
    ])
    expect(checkItems(nouns, null)).toHaveLength(3)
    expect(checkItems(nouns, null).some((i) => i.focus)).toBe(false)
  })

  it('[SR-24] puts the Schwerpunkt first and marks it', () => {
    const items = checkItems(nouns, 'ie')
    expect(items[0]).toEqual({ text: 'Langes i? Meistens schreibt man „ie“.', focus: true })
    expect(items).toHaveLength(4)
  })

  it('[SR-24] a capitalisation or article Schwerpunkt marks the noun check instead of adding one', () => {
    for (const kind of ['case', 'article'] as const) {
      const items = checkItems(verbs, kind)
      expect(items).toHaveLength(3)
      expect(items[0]).toMatchObject({ text: expect.stringContaining('Nomen'), focus: true })
    }
  })

  it('[SR-15] English words: small letters first, no German spelling tips', () => {
    expect(checkItems(verbs, 'ie', 'en').map((i) => i.text)).toEqual([
      'Englische Wörter klein geschrieben? Groß nur „I“ und Namen.',
      'Alle Nummern da, von 1 bis 2?',
      'Jeder Buchstabe gut lesbar? Sonst durchstreichen und daneben neu schreiben.',
    ])
    expect(checkItems(verbs, 'case', 'en')[0].focus).toBe(true)
  })
})
