// Labels and bar data shared by the Trainingsplan cards and the Spielvorbereitung.
import { goalsByRound, type ListStatus } from '../../../shared/dictation/metrics'
import type { WordList } from '../dictation/queries'

export const STATUS_LABEL: Record<ListStatus, string> = { active: 'In Arbeit', new: 'Neu', done: 'Abgeschlossen' }
export const STATUS_ORDER: readonly ListStatus[] = ['active', 'new', 'done']

/** "in 3 Tagen"; the badge says "Spieltag" before it where there is room. */
export function matchDay(days: number | null): string | null {
  if (days === null || days < 0) return null
  return days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`
}

export interface BarSegment {
  roundId: string
  /** The game's number: its place among the list's graded dictations. */
  n: number
  /** Words this game made secure that are still secure. */
  kept: number
  /** Words of the segments before it. */
  from: number
  /** Its place among the segments: the bar alternates two shades. */
  index: number
}

/**
 * The bar's segments (wireframe T11, SR-34): one per graded dictation that holds words it made secure
 * and that are still secure, oldest first. A game without such words has none.
 */
export function barSegments(list: WordList, rounds: readonly WordList['rounds'][number][]): BarSegment[] {
  const graded = rounds.filter((r) => r.results)
  const parts = goalsByRound(
    list.words.map((w) => w.id),
    graded,
  )
  const segments: BarSegment[] = []
  graded.forEach((round, i) => {
    const kept = parts.get(round.id) ?? 0
    if (!kept) return
    const last = segments.at(-1)
    segments.push({ roundId: round.id, n: i + 1, kept, from: last ? last.from + last.kept : 0, index: segments.length })
  })
  return segments
}
