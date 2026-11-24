import { describe, expect, it } from 'vitest'
import { audioPath, audioSsml } from './audio.js'
import { listWord, vocabWord } from './words.js'

describe('spoken audio', () => {
  it('[SR-21] says word, sentence, word and stores under an ASCII name that changes with the text', () => {
    // older lists have text-derived ids with umlauts
    const w = listWord(null, 'blühen', 'blüht', 'Die Rose blüht & duftet.', 'blühen')
    expect(audioSsml(w)).toBe('<speak>blühen<break time="900ms"/>Die Rose blüht &amp; duftet.<break time="900ms"/>blühen</speak>')
    const path = audioPath('fam', 'list', w)
    expect(path).toMatch(/^fam\/list\/bluehen-[a-z0-9]+\.mp3$/)
    expect(audioPath('fam', 'list', { ...w, sentence: 'Die Sonne scheint.' })).not.toBe(path)
  })

  it('[SR-15] Vokabeln: says the German meaning twice, never the English word', () => {
    const w = vocabWord('dog', 'der Hund', 'w1')
    expect(audioSsml(w)).toBe('<speak>der Hund<break time="900ms"/>der Hund</speak>')
    expect(audioPath('fam', 'list', w)).not.toBe(audioPath('fam', 'list', vocabWord('dog', 'der Köter', 'w1')))
  })
})
