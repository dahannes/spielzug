// Parts of a list as the Trainingsplan card and the Spielvorbereitung show it.
import type { ListStatus } from '../../../shared/dictation/metrics'
import type { Discipline, Subject } from '../../../shared/subjects'
import { matchDay, STATUS_LABEL } from './plan'

/** The same white frame and light shadow as the player card (sticker look). */
export const STICKER = 'rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.15),0_10px_24px_rgba(0,0,0,.16)]'

/** Subject tags like on a school timetable: two letters on a fixed colour, the same for every player's kit (white text ≥ 5:1). */
const SUBJECT_TAG: Record<Subject, { short: string; colour: string }> = {
  Deutsch: { short: 'De', colour: 'bg-rose-700' },
  Mathematik: { short: 'Ma', colour: 'bg-teal-700' },
  Englisch: { short: 'En', colour: 'bg-indigo-700' },
}

/** The subject as its tag; screen readers hear the subject's name (unless the text next to it says it already). */
export function SubjectTag({ subject, decorative = false }: { subject: Subject; decorative?: boolean }) {
  const tag = SUBJECT_TAG[subject]
  return (
    <span
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': subject })}
      className={`inline-grid h-6 min-w-7.5 shrink-0 place-items-center rounded-md px-1 font-display text-base leading-none font-extrabold tracking-normal text-white normal-case ${tag.colour}`}
    >
      {tag.short}
    </span>
  )
}

/** Subject and training type: the subject's tag, then e.g. "Wort-Diktat". */
export function ListLabel({ discipline, className = '' }: { discipline: Discipline; className?: string }) {
  return (
    // the display font with wide tracking, like the team name on the player card
    <p className={`flex min-w-0 items-center gap-2 font-display text-sm font-bold tracking-[0.12em] text-slate-500 uppercase ${className}`}>
      <SubjectTag subject={discipline.subject} />
      <span className="truncate">{discipline.name}</span>
    </p>
  )
}

/** Spieltag and status badges, small enough to share the line with the label: same height with or without a visible border (B612 has 400 and 700 only). */
const BADGE = 'inline-flex h-6 items-center rounded-full border-2 px-2.5 text-xs font-bold whitespace-nowrap'

/** Spieltag (until the list is done) and status; phones drop "Spieltag" and say "Abgeschlossen" with ✓ only. */
export function ListBadges({ status, days }: { status: ListStatus; days: number | null }) {
  const badge = matchDay(days)
  return (
    <div className="flex shrink-0 gap-1.5">
      {badge && status !== 'done' && (
        <span className={`${BADGE} border-player text-player`}>
          <span className="hidden sm:inline">Spieltag&nbsp;</span>
          {badge}
        </span>
      )}
      <span className={`${BADGE} border-transparent ${status === 'done' ? 'bg-emerald-100 text-emerald-800' : status === 'new' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-900'}`}>
        {status === 'done' ? (
          <>
            ✓<span className="hidden sm:inline">&nbsp;{STATUS_LABEL.done}</span>
            <span className="sr-only sm:hidden">{STATUS_LABEL.done}</span>
          </>
        ) : (
          STATUS_LABEL[status]
        )}
      </span>
    </div>
  )
}
