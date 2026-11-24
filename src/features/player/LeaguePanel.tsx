// The Liga on the start page and the promotion moment (SR-63, ADR-042).
import { useEffect, useRef, useState } from 'react'
import { earnedLeague, GOAL_LABEL, leagueOf, nextGoals } from '../../../shared/league'
import { Button, Dialog, DialogFooter } from '../../components/ui'
import { useChildren, useRaiseLeague, type Child } from '../children/queries'
import { PLAYER_SCHEMES } from '../children/schemes'
import { useWordLists, type WordList } from '../dictation/queries'
import { useFamily } from '../family/useFamily'
import { playerCareer } from './league'
import { PlayerCrest, TierStars } from './PlayerCrest'

/** "Bezirksliga" with its stars, e.g. on the start page. */
export function LeagueName({ level, className = '' }: { level: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {leagueOf(level).name}
      <TierStars tier={level} className="text-[0.8em]" />
    </span>
  )
}

const STICKER = 'rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.15),0_10px_24px_rgba(0,0,0,.16)]'

/** The Liga tab on the start page: the league and what the next promotion needs. */
export function LeaguePanel({ player, lists }: { player: Child; lists: readonly WordList[] }) {
  const next = nextGoals(player.league, playerCareer(lists, player.id))
  return (
    // the tab names it "Liga"; the card's title is the league itself
    <section className={`${STICKER} p-3`} aria-labelledby="league-heading">
      <div className="px-2 pt-2">
        <h2 id="league-heading" className="text-2xl leading-tight font-bold">
          <LeagueName level={player.league} />
          <span className="sr-only"> ({player.league} von 5 Sternen)</span>
        </h2>
        {next ? (
          <>
            <p className="mt-4 font-bold text-slate-700">Für den Aufstieg in die {next.league.name}:</p>
            <ul className="mt-2 space-y-2 pb-1">
              {next.goals.map((g) => (
                <li key={g.goal}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-700">{GOAL_LABEL[g.goal](g.need)}</span>
                    <span className={`shrink-0 font-bold ${g.have >= g.need ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {g.have >= g.need ? '✓' : `${g.have}/${g.need}`}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 ring-inset" aria-hidden>
                    <div className={`h-full rounded-full ${g.have >= g.need ? 'bg-emerald-600' : 'bg-player'}`} style={{ width: `${(g.have / g.need) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 pb-1 text-slate-700">Höchste Liga! Alle Vereine sind frei.</p>
        )}
      </div>
    </section>
  )
}

/**
 * Raises a player's league when their rounds earned more (after a round, or the first time the app
 * sees older rounds) and celebrates it once. Sits in the layout, so it works on every page.
 */
export function PromotionWatcher() {
  const family = useFamily().data
  const children = useChildren(family?.id).data
  const lists = useWordLists(family?.id).data
  const { mutate: raise } = useRaiseLeague(family?.id)
  const asked = useRef(new Set<string>())
  const [shown, setShown] = useState<{ player: Child; from: number; to: number }[]>([])

  useEffect(() => {
    if (!children || !lists) return
    for (const player of children) {
      const earned = earnedLeague(playerCareer(lists, player.id))
      const key = `${player.id}:${earned}`
      if (earned <= player.league || asked.current.has(key)) continue
      asked.current.add(key)
      raise(
        { playerId: player.id, league: earned },
        { onSuccess: (to) => to && setShown((s) => [...s, { player, from: player.league, to }]) },
      )
    }
  }, [children, lists, raise])

  const current = shown[0]
  return (
    <Dialog open={!!current} onClose={() => setShown((s) => s.slice(1))} label="Aufstieg" size="compact">
      {current && <Promotion {...current} onDone={() => setShown((s) => s.slice(1))} />}
    </Dialog>
  )
}

function Promotion({ player, from, to, onDone }: { player: Child; from: number; to: number; onDone: () => void }) {
  const clubs = PLAYER_SCHEMES.filter((s) => s.tier > from && s.tier <= to)
  return (
    <div className="space-y-4 text-center">
      <p className="font-display text-sm font-bold tracking-[0.12em] text-slate-500 uppercase">Aufstieg!</p>
      <h2 className="font-display text-3xl font-extrabold tracking-wide uppercase">
        <LeagueName level={to} className="justify-center" />
      </h2>
      <p className="text-slate-700">
        {player.name} spielt jetzt in der {leagueOf(to).name}. {clubs.length === 1 ? 'Ein neuer Verein ist frei:' : `${clubs.length} neue Vereine sind frei:`}
      </p>
      <ul className="flex flex-wrap justify-center gap-3">
        {clubs.map((s) => (
          <li key={s.id} className="flex w-20 flex-col items-center gap-1 text-sm font-bold">
            <PlayerCrest schemeId={s.id} className="size-16" />
            {s.label}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-500">Tipp auf deine Spielerkarte, um das Trikot zu wechseln.</p>
      <DialogFooter>
        <Button onClick={onDone}>Super!</Button>
      </DialogFooter>
    </div>
  )
}
