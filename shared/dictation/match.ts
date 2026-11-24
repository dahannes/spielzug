// Which line on the photo belongs to which dictated word (ADR-021, ADR-034). The model reads the
// sheet blind; only here, in code, are the readings set against the dictated words.

/** One line as the model read it from the sheet. */
export interface ReadLine {
  number: number | null
  text: string | null
  confidence: number
}

export interface Match {
  read: string | null
  confidence: number
  /** False when no line was left for this word: the child skipped it. */
  found: boolean
}

const clean = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[„“”"'.,;:!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    previous = current
  }
  return previous[b.length]
}

/** 0 (nothing in common) … 1 (same letters), ignoring case and punctuation. */
export function similarity(written: string | null, expected: string): number {
  if (!written) return 0
  const a = clean(written)
  const b = clean(expected)
  if (!a || !b) return 0
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

/** A written number counts when the line also clearly resembles that word (articles alone reach 0.5). */
const NUMBER_TRUST = 0.7
/** Every pairing of a line with a word scores this plus the similarity: lines stay with words, in order. */
const PAIR = 0.5
/** Extra score when the line's written number is the word's number. */
const NUMBER_BONUS = 0.3

/**
 * 1. A line whose written number points to a word it also resembles goes there, wherever it stands
 *    on the sheet (the surer reading wins a doubled number).
 * 2. The other lines are aligned to the other words in sheet order by content: each pairing scores
 *    PAIR + similarity (+ NUMBER_BONUS for a matching number); leaving a word or a line out scores
 *    0. So a skipped word becomes a gap ("fehlt") instead of shifting every later word by one,
 *    while badly misspelled words still keep their place.
 * A word without any line counts as missing (confidence 1), not as illegible.
 */
export function matchLines(expected: readonly string[], lines: readonly ReadLine[]): Match[] {
  const slots: (ReadLine | undefined)[] = new Array(expected.length).fill(undefined)
  const placed = new Set<ReadLine>()
  const numbered = lines
    .filter((l) => l.number !== null && l.number >= 1 && l.number <= expected.length && similarity(l.text, expected[l.number - 1]) >= NUMBER_TRUST)
    .toSorted((a, b) => b.confidence - a.confidence)
  for (const line of numbered) {
    const i = line.number! - 1
    if (!slots[i]) {
      slots[i] = line
      placed.add(line)
    }
  }

  const words = expected.flatMap((text, index) => (slots[index] ? [] : [{ text, index }]))
  const rest = lines.filter((l) => !placed.has(l))
  // best[i][j]: best score for the first i free words and the first j remaining lines
  const best = Array.from({ length: words.length + 1 }, () => new Array<number>(rest.length + 1).fill(0))
  const pair = (i: number, j: number) => PAIR + similarity(rest[j].text, words[i].text) + (rest[j].number === words[i].index + 1 ? NUMBER_BONUS : 0)
  for (let i = 1; i <= words.length; i++) {
    for (let j = 1; j <= rest.length; j++) best[i][j] = Math.max(best[i - 1][j], best[i][j - 1], best[i - 1][j - 1] + pair(i - 1, j - 1))
  }
  for (let i = words.length, j = rest.length; i > 0 && j > 0; ) {
    if (best[i][j] === best[i - 1][j - 1] + pair(i - 1, j - 1)) {
      slots[words[i - 1].index] = rest[j - 1]
      i--
      j--
    } else if (best[i][j] === best[i - 1][j]) i--
    else j--
  }
  return slots.map((l) => (l ? { read: l.text, confidence: l.confidence, found: true } : { read: null, confidence: 1, found: false }))
}
