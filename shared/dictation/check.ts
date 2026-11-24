// Nachspielzeit: what the child checks on the sheet before the photo (SR-24).
import type { ErrorKind } from './compare.js'
import type { ListWord } from './words.js'

export interface CheckItem {
  text: string
  /** The player's Schwerpunkt (SR-60): shown first and marked. */
  focus: boolean
}

/** A concrete thing to look for per spelling kind; "case" and "article" share the noun check. */
const TIPS: Partial<Record<ErrorKind, string>> = {
  ie: 'Langes i? Meistens schreibt man „ie“.',
  's-sound': 's, ss oder ß? Sprich das Wort langsam.',
  umlaut: 'Pünktchen auf ä, ö und ü?',
  double: 'Kurzer Laut? Dann oft doppelt: mm, ll, tt.',
  h: 'Langer Laut? Fehlt ein „h“ wie in „fahren“?',
}

/**
 * The checklist for a round: numbers, nouns, the Schwerpunkt, legible letters. English words are
 * written small, unlike German nouns; the German spelling tips do not apply to them.
 */
export function checkItems(words: readonly Pick<ListWord, 'article'>[], focus: ErrorKind | null, language: 'de' | 'en' = 'de'): CheckItem[] {
  const numbers = { text: `Alle Nummern da, von 1 bis ${words.length}?`, focus: false }
  const legible = { text: 'Jeder Buchstabe gut lesbar? Sonst durchstreichen und daneben neu schreiben.', focus: false }
  if (language === 'en') return [{ text: 'Englische Wörter klein geschrieben? Groß nur „I“ und Namen.', focus: focus === 'case' }, numbers, legible]
  const nounFocus = focus === 'case' || focus === 'article'
  const items: CheckItem[] = [numbers]
  if (words.some((w) => w.article) || nounFocus) items.push({ text: 'Nomen mit der, die oder das – und groß geschrieben?', focus: nounFocus })
  const tip = focus && TIPS[focus]
  if (tip) items.push({ text: tip, focus: true })
  items.push(legible)
  return items.toSorted((a, b) => Number(b.focus) - Number(a.focus))
}
