// What a player card shows; shared by the start page, the trainer gallery and the edit preview.

import type { ErrorKind } from '../../../shared/dictation/compare'
import { currentList, focus, goals, hitRate, streak } from '../../../shared/dictation/metrics'
import { fitsGrade } from '../../../shared/subjects'
import { gradesOf, roundsOf, useWordLists, type WordList } from '../dictation/queries'

export interface CardData {
  name: string
  shirtNumber: number | null
  position: string | null
  grade: number | null
  color: string
}

export const cardOf = (child: { name: string; shirt_number: number | null; position: string | null; grade: number | null; color: string }): CardData => ({
  name: child.name,
  shirtNumber: child.shirt_number,
  position: child.position,
  grade: child.grade,
  color: child.color,
})

/** How the card names a mistake kind (Schwerpunkt). */
const FOCUS_LABEL: Partial<Record<ErrorKind, string>> = {
  ie: '„ie“',
  case: 'groß/klein',
  article: 'der/die/das',
  double: 'Doppelte',
  's-sound': 's/ss/ß',
  umlaut: 'ä/ö/ü',
  h: '„h“',
}

export type CardStat = readonly [label: string, value: string]

/** Who the stats are for: a player not saved yet has no id. */
export interface StatsPlayer {
  id: string | undefined
  grade: number | null
}

/**
 * The four stats every card carries: the card list is chosen among the lists of the player's
 * Klasse only (SR-60), the Serie counts every round. A player without rounds (or not saved yet) shows dashes.
 */
export function cardStats(allLists: readonly WordList[], player: StatsPlayer): CardStat[] {
  const { id: playerId, grade } = player
  const lists = grade === null ? allLists : allLists.filter((l) => fitsGrade(gradesOf(l), grade))
  const list = currentList(lists)
  const rounds = list ? roundsOf(list, playerId) : []
  const rate = hitRate(rounds)
  // A Berichtigung is practice too: it keeps the Serie going (SR-25).
  const days = streak(allLists.flatMap((l) => [...roundsOf(l, playerId), ...l.corrections.filter((r) => r.child_id === playerId)].map((r) => r.checked_at)))
  const kind = focus(rounds)
  return [
    ['Tore', list ? `${goals(list.words.map((w) => w.id), rounds)}/${list.words.length}` : '–'],
    ['Trefferquote', rate === null ? '–' : `${Math.round(rate * 100)} %`],
    ['Serie', days === 0 ? '–' : days === 1 ? '1 Tag' : `${days} Tage`],
    ['Schwerpunkt', (kind && FOCUS_LABEL[kind]) ?? '–'],
  ]
}

/** The stats of a player's card from the shared word list cache; dashes for a player not saved yet. */
export function useCardStats(familyId: string, player: StatsPlayer): CardStat[] {
  return cardStats(useWordLists(familyId).data ?? [], player)
}
