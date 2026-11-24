import { describe, expect, it } from 'vitest'
import { expectedText, listWord, MAX_SENTENCE, parseTypedList, parseTypedVocab, uniqueWords } from './words.js'

describe('word lists', () => {
  it('[SR-11] reads typed lists like the school list', () => {
    const words = parseTypedList('der Hund\nviele (vieles)\n\nlaufen (läuft)\nder Hund\ndie Wiese')
    expect(words.map(expectedText)).toEqual(['der Hund', 'viele', 'laufen', 'die Wiese'])
    expect(words[2]).toMatchObject({ form: 'läuft', article: null })
  })

  it('[SR-11] gives every word its own stable id; only exactly the same text is a duplicate', () => {
    const [laut, lautNoun] = parseTypedList('laut\nder Laut')
    expect(laut.id).not.toBe(lautNoun.id)
    expect(uniqueWords(parseTypedList('Laut\nlaut\nLaut')).map(expectedText)).toEqual(['Laut', 'laut'])
    const edited = listWord(laut.article, 'leise', null, 'Sei leise!', laut.id)
    expect(edited.id).toBe(laut.id)
  })

  it('[SR-11] caps long example sentences', () => {
    expect(listWord(null, 'rund', null, 'x'.repeat(500)).sentence).toHaveLength(MAX_SENTENCE)
  })

  it('[SR-15] Vokabeln: one English–German pair per line, with =, ; , a tab or a spaced dash', () => {
    const words = parseTypedVocab('dog = der Hund\nT-shirt - das T-Shirt\nice cream;das Eis\nred\trot\nnur ein Wort')
    expect(words.map((w) => [w.word, w.translation, w.article])).toEqual([
      ['dog', 'der Hund', null],
      ['T-shirt', 'das T-Shirt', null],
      ['ice cream', 'das Eis', null],
      ['red', 'rot', null],
    ])
    expect(expectedText(words[0])).toBe('dog')
    expect(listWord(null, 'elf').translation).toBeUndefined()
  })
})
