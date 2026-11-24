import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { correctionState } from '../../../shared/dictation/corrections'
import { goals, listStatus, newGoals } from '../../../shared/dictation/metrics'
import { isSecure, wordStats } from '../../../shared/dictation/pick'
import { daysUntil } from '../../../shared/dictation/schedule'
import { expectedText } from '../../../shared/dictation/words'
import { disciplineOf } from '../../../shared/subjects'
import { paths } from '../../app/paths'
import { focusClass } from '../../components/styles'
import { BackLink, Button, ErrorText, Loading } from '../../components/ui'
import { useChildren, useCurrentChild } from '../children/queries'
import { heroStyle, playerScheme } from '../children/schemes'
import { correctionsOf, roundsOf, useStartCorrection, useStartRound, useWordLists, type WordList } from '../dictation/queries'
import { useFamily } from '../family/useFamily'
import { ListBadges, ListLabel, STICKER } from './ListParts'
import { barSegments } from './plan'
import { HeroPattern } from './PlayerCrest'
import { RoundsBar } from './RoundsBar'

type Dictation = WordList['rounds'][number]

/**
 * Spielvorbereitung (SR-64): one list for the player on the device – its progress, the training
 * start, the games so far with their reports and Berichtigungen, and the words.
 */
export function TrainingPage() {
  const { listId } = useParams()
  const family = useFamily().data
  const children = useChildren(family?.id)
  const lists = useWordLists(family?.id)
  const { current: player } = useCurrentChild(children.data)
  const start = useStartRound()

  if (!family || children.isPending || lists.isPending) return <Loading />
  if (children.isError || lists.isError) return <ErrorText>Die Daten konnten nicht geladen werden. Prüf die Verbindung und lade die Seite neu.</ErrorText>
  const list = lists.data.find((l) => l.id === listId)
  if (!list || !player) {
    return (
      <section className="space-y-3">
        <BackLink to={paths.home}>Trainingsplan</BackLink>
        <p className="text-slate-600">Diese Liste gibt es nicht.</p>
      </section>
    )
  }

  const rounds = roundsOf(list, player.id)
  const ids = list.words.map((w) => w.id)
  const secure = goals(ids, rounds)
  const scheme = playerScheme(player.color)
  const disabled = start.isPending || list.words.length === 0

  return (
    <section className="space-y-4">
      <title>{`${list.title} – Spielzug`}</title>
      <BackLink to={paths.home}>Trainingsplan</BackLink>
      {/* phone: one column; tablet: progress and start on the left, games and words beside them */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <header>
            <p className="font-display text-sm font-bold tracking-[0.12em] text-slate-500 uppercase">Spielvorbereitung</p>
            <div className="mt-2 flex items-center gap-3">
              <ListLabel discipline={disciplineOf(list.discipline)} />
              <ListBadges status={listStatus(ids, rounds)} days={daysUntil(list.test_date)} />
            </div>
            <h1 className="mt-1 font-display text-4xl leading-none font-extrabold tracking-wide uppercase">{list.title}</h1>
          </header>
          <div className={`space-y-3 p-4 ${STICKER}`}>
            <RoundsBar list={list} rounds={rounds} className="h-8" />
            <p className="text-slate-700">
              <b className="text-xl text-slate-900">{secure}</b> von {list.words.length} Wörtern sicher
            </p>
            <button
              type="button"
              aria-label={`Training starten: ${list.title}`}
              disabled={disabled}
              onClick={() => start.mutate({ list, childId: player.id })}
              // the kit as a hero surface; disabled it turns plain grey (an inline background would beat the class)
              style={disabled ? undefined : heroStyle(scheme)}
              className={`relative flex h-18 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg px-4 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white ${focusClass}`}
            >
              {!disabled && <HeroPattern scheme={scheme} />}
              <span className="relative text-3xl leading-none" aria-hidden>
                ▶
              </span>
              <span className="relative font-display text-2xl leading-none font-extrabold tracking-wide uppercase" aria-hidden>
                Training starten
              </span>
            </button>
            <ErrorText>{start.isError && 'Das Training konnte nicht gestartet werden.'}</ErrorText>
          </div>
        </div>
        <div className="space-y-6">
          <Games list={list} rounds={rounds} />
          <Words list={list} rounds={rounds} />
        </div>
      </div>
    </section>
  )
}

/** The list's games, newest first; each opens its report, with its Berichtigung below it. */
function Games({ list, rounds }: { list: WordList; rounds: Dictation[] }) {
  const graded = rounds.filter((r) => r.results)
  // a game's number matches its segment in the bar, the colour too
  const segments = new Map(barSegments(list, rounds).map((s) => [s.roundId, s.index]))
  const games = graded.map((round, i) => ({ round, n: i + 1, scored: newGoals(graded.slice(0, i), round).length })).reverse()
  const unfinished = rounds.filter((r) => !r.results).reverse()

  return (
    <section aria-labelledby="games-heading">
      <h2 id="games-heading" className="mb-2 font-display text-2xl font-extrabold tracking-wide uppercase">
        Spiele
      </h2>
      {games.length === 0 && unfinished.length === 0 ? (
        <p className="text-slate-600">Noch kein Spiel mit dieser Liste. Starte das erste Training!</p>
      ) : (
        <ol className="space-y-2.5">
          {unfinished.map((round) => (
            <li key={round.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <GameLink to={paths.round(round.id)} label={`Angefangenes Spiel, ${day(round.created_at)}, weiterspielen`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-200 text-sm text-slate-600" aria-hidden>
                  ▶
                </span>
                <span className="flex-1 font-bold">Angefangen</span>
                <span className="text-sm text-slate-500">{day(round.created_at)}</span>
              </GameLink>
            </li>
          ))}
          {games.map(({ round, n, scored }) => {
            const results = round.results!
            const right = results.filter((r) => r.verdict === 'right').length
            const index = segments.get(round.id)
            return (
              <li key={round.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <GameLink to={paths.round(round.id)} label={`Spiel ${n}, ${day(round.checked_at ?? round.created_at)}, ${right} von ${results.length} richtig`}>
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${index === undefined ? 'bg-slate-200 text-slate-600' : index % 2 ? 'bg-player/70 text-white' : 'bg-player text-white'}`}
                    aria-hidden
                  >
                    {n}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <b>Spiel {n}</b>
                    <span className="text-sm text-slate-500">{day(round.checked_at ?? round.created_at)}</span>
                  </span>
                  <span className="flex flex-col text-right text-sm leading-tight font-bold">
                    {right} von {results.length} richtig
                    {scored > 0 && <span className="font-normal text-slate-500">+{scored} {scored === 1 ? 'Tor' : 'Tore'}</span>}
                  </span>
                </GameLink>
                <Correction list={list} dictation={round} />
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/** A Berichtigung under its game: start or go on with the words still wrong, or open the finished one. */
function Correction({ list, dictation }: { list: WordList; dictation: Dictation }) {
  const start = useStartCorrection()
  const wrong = dictation.results!.filter((r) => r.verdict === 'wrong').length
  if (wrong === 0) return null
  const corrections = correctionsOf(list, dictation.id)
  const { open, done } = correctionState(dictation, corrections)
  const latest = corrections.filter((c) => c.results).at(-1)

  if (done && latest) {
    return (
      <GameLink to={paths.round(latest.id)} label={`Berichtigung von Spiel, geschafft, ${day(latest.checked_at ?? latest.created_at)}`} sub>
        <span className="flex-1">Berichtigung · {day(latest.checked_at ?? latest.created_at)}</span>
        <span className="font-bold text-emerald-800">✓ geschafft</span>
      </GameLink>
    )
  }
  const words = open.length === 1 ? '1 Wort' : `${open.length} Wörter`
  return (
    <div className="border-t border-slate-200 bg-amber-50 px-3 py-2 pl-14">
      <Button variant="secondary" className="w-full" disabled={start.isPending} onClick={() => start.mutate({ list, round: dictation })}>
        ✏️ {latest ? 'Nochmal berichtigen' : 'Berichtigung'}: {words}
      </Button>
    </div>
  )
}

function GameLink({ to, label, sub = false, children }: { to: string; label: string; sub?: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`flex items-center gap-3 px-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_3px_var(--player)] ${
        sub ? 'min-h-11 border-t border-slate-200 pl-14 text-sm text-slate-600' : 'min-h-14 py-2'
      }`}
    >
      {children}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden>
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

/** Every word of the list; the secure ones (right the last time) in green with ✓. */
function Words({ list, rounds }: { list: WordList; rounds: Dictation[] }) {
  const stats = wordStats(rounds)
  return (
    <section aria-labelledby="words-heading">
      <h2 id="words-heading" className="mb-2 font-display text-2xl font-extrabold tracking-wide uppercase">
        Wörter <span className="text-base text-slate-500">{list.words.length}</span>
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {list.words.map((w) =>
          isSecure(stats.get(w.id)) ? (
            <li key={w.id} className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800">
              <span aria-hidden>✓ </span>
              {expectedText(w)}
              <span className="sr-only"> (sicher)</span>
            </li>
          ) : (
            <li key={w.id} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-700">
              {expectedText(w)}
            </li>
          ),
        )}
      </ul>
    </section>
  )
}

const day = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
