// Compares what the child wrote (read blind by the LLM) with the expected word, in code –
// the model never sees the expected word, so it cannot quietly correct the spelling (ADR-021).

export type Verdict = 'right' | 'wrong'
export type ErrorKind = 'missing' | 'illegible' | 'article' | 'case' | 'ie' | 's-sound' | 'umlaut' | 'double' | 'h' | 'letters'

/**
 * Below this confidence a reading that does not match counts as illegible – a mistake, as in
 * school (ADR-021). Kept low on purpose: Haiku rates clear handwriting at 0.6–0.8, and a
 * letter-by-letter verdict on such a reading would be unreliable.
 */
const LEGIBLE = 0.3

/**
 * Between LEGIBLE and this, the reading counts but is marked "unsicher gelesen" in the report, so
 * a trainer can check it against the photo (clear handwriting comes back at 0.6–0.8).
 */
const UNSURE = 0.5

/** A reading that was graded but deserves a look at the photo. */
export const isUnsure = (r: { read: string | null; confidence: number }) => r.read !== null && r.confidence >= LEGIBLE && r.confidence < UNSURE

const clean = (s: string) => s.normalize('NFC').replace(/[„“”"'.,;:!?]/g, '').replace(/\s+/g, ' ').trim()

const RULES: [ErrorKind, (s: string) => string][] = [
  ['ie', (s) => s.replace(/ie/g, 'i')],
  ['s-sound', (s) => s.replace(/ß|ss/g, 's')],
  ['umlaut', (s) => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')],
  ['double', (s) => s.replace(/(.)\1/g, '$1')],
  ['h', (s) => s.replace(/([aeiouäöü])h/g, '$1')],
]

function splitArticle(s: string): [string | null, string] {
  const m = s.match(/^(der|die|das)\s+(.+)$/i)
  return m ? [m[1], m[2]] : [null, s]
}

/** Which kinds of mistakes explain the difference between expected and written. */
export function errorKinds(expected: string, written: string): ErrorKind[] {
  const [ea, ew] = splitArticle(clean(expected))
  const [wa, ww] = splitArticle(clean(written))
  const kinds: ErrorKind[] = []
  if (ea && ea !== wa) kinds.push(ea.toLowerCase() === wa?.toLowerCase() ? 'case' : 'article')
  if (ew === ww) return kinds
  if (ew.toLowerCase() === ww.toLowerCase()) return [...kinds, 'case']
  if (ew[0] !== ww[0] && ew[0]?.toLowerCase() === ww[0]?.toLowerCase()) kinds.push('case')
  const e = ew.toLowerCase()
  const w = ww.toLowerCase()
  const single = RULES.filter(([, f]) => f(e) === f(w)).map(([k]) => k)
  if (single.length) return [...kinds, ...single]
  const all = (s: string) => RULES.reduce((acc, [, f]) => f(acc), s)
  const combined = RULES.filter(([, f]) => f(e) !== e || f(w) !== w).map(([k]) => k)
  if (all(e) === all(w) && combined.length) return [...kinds, ...combined]
  return [...kinds, 'letters']
}

export function judgeWord(expected: string, written: string | null, confidence: number): { verdict: Verdict; errors: ErrorKind[] } {
  if (written === null || clean(written) === '') {
    return { verdict: 'wrong', errors: [confidence >= LEGIBLE ? 'missing' : 'illegible'] }
  }
  if (clean(written) === clean(expected)) return { verdict: 'right', errors: [] }
  if (confidence < LEGIBLE) return { verdict: 'wrong', errors: ['illegible'] }
  return { verdict: 'wrong', errors: errorKinds(expected, written) }
}

export type DiffPart = { text: string; kind: 'same' | 'missing' | 'extra' }

/** Letter diff (LCS): which letters are missing from or extra in what the child wrote. */
export function letterDiff(expected: string, written: string): DiffPart[] {
  const a = [...clean(expected)]
  const b = [...clean(written)]
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const parts: DiffPart[] = []
  const push = (text: string, kind: DiffPart['kind']) => {
    const last = parts.at(-1)
    if (last?.kind === kind) last.text += text
    else parts.push({ text, kind })
  }
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push(a[i++], 'same')
      j++
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) push(b[j++], 'extra')
    else push(a[i++], 'missing')
  }
  return parts
}
