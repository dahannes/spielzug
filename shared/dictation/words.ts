// Lernwörter of a word list (ADR-021).

type Article = 'der' | 'die' | 'das'

export interface ListWord {
  id: string
  article: Article | null
  word: string
  /** Extra form from the list, e.g. "läuft" for "laufen (läuft)"; not dictated yet. */
  form: string | null
  /** Short example sentence that makes article and capitalisation clear when spoken. */
  sentence: string | null
  /** Vokabeln: the German meaning – what is said; the child writes `word` in English. */
  translation?: string | null
}

/** What the child has to write: article and word. */
export const expectedText = (w: Pick<ListWord, 'article' | 'word'>) => (w.article ? `${w.article} ${w.word}` : w.word)

/** Example sentences are read aloud; longer ones only cost time and Polly characters. */
export const MAX_SENTENCE = 200

/**
 * Words get a random id once and keep it when edited, so progress survives fixing a typo in the
 * sentence, and "Laut" and "laut" stay two words. Older lists keep their text-derived ids.
 */
const newWordId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

export function listWord(
  article: string | null,
  word: string,
  form: string | null = null,
  sentence: string | null = null,
  id: string = newWordId(),
  translation: string | null = null,
): ListWord {
  const a = article?.toLowerCase()
  const art = a === 'der' || a === 'die' || a === 'das' ? a : null
  const w: ListWord = { id, article: art, word: word.trim(), form: form?.trim() || null, sentence: sentence?.trim().slice(0, MAX_SENTENCE) || null }
  return translation?.trim() ? { ...w, translation: translation.trim() } : w
}

/** A Vokabeln entry: the English word to write and its German meaning. */
export const vocabWord = (english: string, german: string, id?: string) => listWord(null, english, null, null, id, german)

/** Keeps the first of words with exactly the same text (case-sensitive: "Laut" ≠ "laut"). */
export function uniqueWords(words: readonly ListWord[]): ListWord[] {
  const seen = new Set<string>()
  return words.filter((w) => {
    const key = expectedText(w)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** One entry per line, as on the school list: "der Hund", "viele (vieles)", "laufen (läuft)". */
export function parseTypedList(text: string): ListWord[] {
  return uniqueWords(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        const m = line.match(/^(?:(der|die|das)\s+)?([^()]+?)\s*(?:\((.+)\))?$/i)
        return m ? [listWord(m[1] ?? null, m[2], m[3] ?? null)] : []
      }),
  )
}

/** Vokabeln, one pair per line: "dog = der Hund" (also "-", "–", ";" or a tab between). */
export function parseTypedVocab(text: string): ListWord[] {
  return uniqueWords(
    text
      .split('\n')
      .map((line) => line.trim())
      .flatMap((line) => {
        const m = line.match(/^(.+?)\s*(?:=|;|\t|\s[-–]\s)\s*(.+)$/)
        return m ? [vocabWord(m[1], m[2])] : []
      }),
  )
}
