// A player's Liga (SR-63, ADR-042): their career over the team's lists and the clubs it opens.
import { career, earnedLeague, type Career, type LeagueLevel } from '../../../shared/league'
import type { PlayerScheme } from '../children/schemes'
import { roundsOf, useWordLists, type WordList } from '../dictation/queries'

/** One player's career over all lists of the team (not just those of their Klasse). */
export const playerCareer = (lists: readonly WordList[], playerId: string | undefined): Career =>
  career(lists.map((l) => ({ id: l.id, rounds: roundsOf(l, playerId), corrections: l.corrections.filter((c) => c.child_id === playerId) })))

/** The league a player's rounds have earned; 1 for a player not saved yet. */
export function useEarnedLeague(familyId: string, playerId: string | undefined): LeagueLevel {
  return earnedLeague(playerCareer(useWordLists(familyId).data ?? [], playerId))
}

/**
 * A club can be worn when its rarity is not above the league – or when the player wears it already
 * (chosen before the leagues existed, or before a trainer set the league lower).
 */
export const clubOpen = (scheme: PlayerScheme, league: number, worn: string | undefined) => scheme.tier <= league || scheme.id === worn
