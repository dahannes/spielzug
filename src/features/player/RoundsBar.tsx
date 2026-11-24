import type { WordList } from '../dictation/queries'
import { barSegments } from './plan'

type Round = WordList['rounds'][number]

/** Lists longer than this show a notch for every fifth word only. */
const ALL_NOTCHES_UP_TO = 60

/**
 * Progress of one list as the rounds that built it (wireframe T11, SR-34), shown only: each segment
 * holds the words a game made secure that are still secure, numbered like the game. Notches at the
 * bottom mark the words. The games' reports open from the Spielvorbereitung's list of games.
 */
export function RoundsBar({ list, rounds, className = 'h-6' }: { list: WordList; rounds: Round[]; className?: string }) {
  const total = list.words.length
  const segments = barSegments(list, rounds)
  const secure = segments.reduce((sum, s) => sum + s.kept, 0)

  return (
    <div role="img" aria-label={`${secure} von ${total} Wörtern sicher`} className={`flex overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 ring-inset ${className}`}>
      {segments.map((s) => (
        <span
          key={s.roundId}
          style={{ width: `${(s.kept / total) * 100}%` }}
          className={`relative flex items-center justify-center overflow-hidden border-r-2 border-white text-xs font-bold text-white ${s.index % 2 ? 'bg-player/70' : 'bg-player'}`}
        >
          {s.kept / total > 0.04 ? s.n : ''}
          <Notches from={s.from} count={s.kept} total={total} onColour />
        </span>
      ))}
      {secure < total && (
        <span className="relative flex-1">
          <Notches from={secure} count={total - secure} total={total} />
        </span>
      )}
    </div>
  )
}

/**
 * One notch per word boundary inside a part of the bar (words `from` to `from + count`), every fifth
 * taller. The part's own edges are the boundaries next to it, so they get none.
 */
function Notches({ from, count, total, onColour = false }: { from: number; count: number; total: number; onColour?: boolean }) {
  const every = total > ALL_NOTCHES_UP_TO ? 5 : 1
  const marks: number[] = []
  for (let j = 1; j < count; j++) if ((from + j) % every === 0) marks.push(j)
  return (
    <span className="pointer-events-none absolute inset-0">
      {marks.map((j) => {
        const fifth = (from + j) % 5 === 0
        return (
          <span
            key={j}
            style={{ left: `${(j / count) * 100}%` }}
            className={`absolute bottom-0 w-px -translate-x-1/2 ${fifth ? 'h-3.5' : 'h-2'} ${onColour ? (fifth ? 'bg-white/40' : 'bg-white/25') : fifth ? 'bg-slate-600/25' : 'bg-slate-500/15'}`}
          />
        )
      })}
    </span>
  )
}
