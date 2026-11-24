import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listStatus, type ListStatus } from '../../../shared/dictation/metrics'
import { daysUntil } from '../../../shared/dictation/schedule'
import { paths } from '../../app/paths'
import { focusClass } from '../../components/styles'
import { Button, ButtonLink, Card, ErrorText, Loading } from '../../components/ui'
import { useChildren, useCurrentChild, usePlayerPhoto, type Child } from '../children/queries'
import { disciplineOf, fitsGrade, LIST_DISCIPLINES, planFor, type Discipline, type Subject } from '../../../shared/subjects'
import { gradesOf, roundsOf, useWordLists, type WordList } from '../dictation/queries'
import { TAP_GUARD_MS } from '../dictation/roundStep'
import { useFamily } from '../family/useFamily'
import { cardOf, cardStats } from './card'
import { CardFace } from './CardFace'
import { CardSwiper } from './CardSwiper'
import { LeaguePanel } from './LeaguePanel'
import { RoundsBar } from './RoundsBar'
import { ListBadges, ListLabel, STICKER, SubjectTag } from './ListParts'
import { STATUS_LABEL, STATUS_ORDER } from './plan'
import { motion, useReducedMotion } from 'motion/react'
import { PlayerDialog, PlayerForm } from './PlayerForm'
import { supabase } from '../../lib/supabase'

/** Start page (wireframes T1/P1, T12/P11): the player card with a swipe carousel, then the training plan by subject. */
export function PlayerCardPage() {
  const family = useFamily().data
  const children = useChildren(family?.id)
  const lists = useWordLists(family?.id)
  const { current, choose } = useCurrentChild(children.data)
  // while the card is in the modal, its place on the page stays empty (it is picked up from there and put back)
  const [editing, setEditing] = useState(false)
  // a sticker never lies quite straight: a new random tilt on every change of player
  const [tilt, setTilt] = useState(randomTilt)
  const reduceMotion = useReducedMotion() ?? false

  if (!family || children.isPending || lists.isPending) return <Loading />
  if (children.isError || lists.isError) return <ErrorText>Die Daten konnten nicht geladen werden. Prüf die Verbindung und lade die Seite neu.</ErrorText>
  if (!current) {
    return (
      <Card className="mx-auto max-w-xl">
        <title>Spielzug</title>
        <h1 className="text-2xl font-bold">Wer spielt?</h1>
        <p className="mb-5 mt-1 text-slate-600">Leg zuerst den Spieler an, der die Diktate schreibt.</p>
        <PlayerForm familyId={family.id} team={family.name} trainer onSaved={choose} />
        {/* Later, signing out sits behind the trainer PIN; a brand-new account has none yet. */}
        <Button variant="link" className="mt-2 px-0 text-sm font-normal text-slate-500" onClick={() => void supabase.auth.signOut()}>
          Abmelden
        </Button>
      </Card>
    )
  }

  const kids = children.data
  const index = kids.findIndex((c) => c.id === current.id)
  // a player sees only the lists meant for their Klasse
  const mine = lists.data.filter((l) => fitsGrade(gradesOf(l), current.grade))

  return (
    // phone: card, then the tabs; tablet: card on the left, the tabs beside it
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
      <title>{`${current.name} – Spielzug`}</title>
      <Carousel players={kids} index={index} onChoose={(i) => {
          choose(kids[i].id)
          setTilt(randomTilt())
        }}>
        {/* the card is one object: in the modal it leaves an empty place here (shared layoutId) */}
        {editing ? (
          <div aria-hidden className="mx-auto aspect-5/7 w-full max-w-[max(16rem,calc((100dvh-13rem)*5/7))]" />
        ) : (
          <motion.div layoutId={`player-card-${current.id}`} transition={{ layout: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 34 } }}>
            {/* the tilt sits inside the shared-layout element, so the flight into the editor measures an upright box */}
            <div style={{ transform: `rotate(${tilt.rotate}deg) skewX(${tilt.skew}deg)` }}>
              <PlayerCard player={current} team={family.name} lists={mine} onEdit={() => setEditing(true)} />
            </div>
          </motion.div>
        )}
      </Carousel>
      {/* The player edits their own card (wireframe T8); the grade stays with the trainers. */}
      <PlayerDialog
        open={editing}
        layoutId={`player-card-${current.id}`}
        onClose={() => setEditing(false)} familyId={family.id} team={family.name} child={current} trainer={false} />
      <StartTabs
        // key: a new player starts unfiltered
        plan={<TrainingPlan key={current.id} lists={mine} player={current} />}
        // the league counts every list of the team, not only those of the Klasse
        league={<LeaguePanel player={current} lists={lists.data} />}
      />
    </div>
  )
}

/** −1.5° to +1.5° of rotation and a hint of skew (±0.3°), like a sticker put on by hand. */
function randomTilt() {
  return { rotate: Math.random() * 3 - 1.5, skew: Math.random() * 0.6 - 0.3 }
}

const TABS = [
  ['plan', 'Trainingsplan'],
  ['liga', 'Liga'],
] as const
type Tab = (typeof TABS)[number][0]

/**
 * Trainingsplan and Liga as two equal tabs. The open tab is in the URL (`?tab=liga`), so it stays
 * after a reload and when coming back from a round; both panels stay mounted (filters are kept).
 */
function StartTabs({ plan, league }: { plan: ReactNode; league: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'liga' ? 'liga' : 'plan'
  const buttons = useRef(new Map<Tab, HTMLButtonElement>())

  function choose(next: Tab) {
    setParams(next === 'plan' ? {} : { tab: next }, { replace: true })
  }

  // arrow keys move between the tabs (ARIA tabs pattern, automatic activation)
  function onKeyDown(e: KeyboardEvent) {
    const i = TABS.findIndex(([id]) => id === tab)
    const to = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: TABS.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    const next = TABS[(to + TABS.length) % TABS.length][0]
    choose(next)
    buttons.current.get(next)?.focus()
  }

  return (
    <section className="min-w-0">
      <div role="tablist" aria-label="Startseite" className="flex gap-6 border-b-2 border-slate-200" onKeyDown={onKeyDown}>
        {TABS.map(([id, label]) => (
          <button
            key={id}
            ref={(el) => void (el ? buttons.current.set(id, el) : buttons.current.delete(id))}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => choose(id)}
            // the same size as a page title: both tabs are headings of equal rank
            className={`-mb-0.5 min-h-11 border-b-4 pb-1 font-display text-3xl font-extrabold tracking-wide uppercase ${
              tab === id ? 'border-player text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
            } ${focusClass}`}
          >
            {label}
          </button>
        ))}
      </div>
      {TABS.map(([id]) => (
        <div key={id} id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} hidden={tab !== id} className="space-y-4 pt-4">
          {id === 'plan' ? plan : league}
        </div>
      ))}
    </section>
  )
}

/**
 * Changes the player: the card follows the finger and slides in, arrows and dots below it.
 * The app takes on the player's colour.
 */
// A double tap moves one card: with two players a second "next" would land back on the first.
// Module-level, because the page remounts with the new player.
let cardChangedAt = -Infinity

function Carousel({ players, index, onChoose, children }: { players: readonly Child[]; index: number; onChoose: (i: number) => void; children: ReactNode }) {
  const [direction, setDirection] = useState<1 | -1>(1)
  const many = players.length > 1

  function go(i: number, dir: 1 | -1) {
    if (performance.now() - cardChangedAt < TAP_GUARD_MS) return
    cardChangedAt = performance.now()
    setDirection(dir)
    onChoose((i + players.length) % players.length)
  }

  return (
    <section aria-label="Spieler wählen" className="flex flex-col gap-4">
      <CardSwiper itemKey={players[index].id} direction={direction} onSwipe={(dir) => go(index + dir, dir)} canSwipe={() => many}>
        {children}
      </CardSwiper>
      {many && (
        <div className="flex items-center justify-between gap-3">
          <ArrowButton label="Vorheriger Spieler" onClick={() => go(index - 1, -1)} direction="left" />
          <div className="flex flex-wrap justify-center">
            {players.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Spieler ${p.name}`}
                aria-current={i === index}
                onClick={() => go(i, i < index ? -1 : 1)}
                className={`grid size-8 place-items-center rounded-full ${focusClass}`}
              >
                <span className={`rounded-full transition-all ${i === index ? 'h-3 w-7 bg-player' : 'size-3 bg-slate-300 hover:bg-slate-400'}`} />
              </button>
            ))}
          </div>
          <ArrowButton label="Nächster Spieler" onClick={() => go(index + 1, 1)} direction="right" />
        </div>
      )}
    </section>
  )
}

function ArrowButton({ label, direction, onClick }: { label: string; direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid size-14 shrink-0 place-items-center rounded-full bg-player text-white shadow-md hover:brightness-90 active:scale-95 ${focusClass}`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

/** Panini-style card: team, number, name, position and four stats. */
function PlayerCard({ player, team, lists, onEdit }: { player: Child; team: string; lists: WordList[]; onEdit: () => void }) {
  return (
    <CardFace
      // as wide as the column, but never taller than the screen leaves room for (arrows below)
      className="mx-auto w-full max-w-[max(16rem,calc((100dvh-13rem)*5/7))]"
      label={`Spielerkarte ${player.name}`}
      team={team}
      card={cardOf(player)}
      photo={usePlayerPhoto(player.photo_path)}
      onEdit={onEdit}
      stats={cardStats(lists, player)}
    />
  )
}


/**
 * The player's Trainingsplan (SR-13, SR-14): one flat list of everything for their Klasse, each
 * card labelled with subject and training type – the next tests first, then the rest newest first,
 * then what comes later. Filters by subject and status above it.
 */
function TrainingPlan({ lists, player }: { lists: WordList[]; player: Child }) {
  const [subject, setSubject] = useState<Subject | 'all'>('all')
  const [status, setStatus] = useState<ListStatus | 'all'>('all')
  // the filters fold away: most of the time the plan is short enough to see at once
  const [filterOpen, setFilterOpen] = useState(false)
  const plan = planFor(player.grade)
  const disciplines = plan.flatMap((s) => s.disciplines)
  // training types with word lists that suit the player's Klasse (Wort-Diktat, Vokabeln)
  const withLists = disciplines.filter((d) => d.available && LIST_DISCIPLINES.some((id) => id === d.id))
  const entries = lists
    .filter((list) => withLists.some((d) => d.id === list.discipline))
    .map((list) => {
      const rounds = roundsOf(list, player.id)
      return { list, discipline: disciplineOf(list.discipline), rounds, status: listStatus(list.words.map((w) => w.id), rounds), days: daysUntil(list.test_date) }
    })
    .sort(chronological)
  const fits = (d: Discipline) => subject === 'all' || d.subject === subject
  const shown = entries.filter((e) => fits(e.discipline) && (status === 'all' || e.status === status))
  const soon = status === 'all' ? disciplines.filter((d) => !d.available && fits(d)) : []
  // a training type without a list for this Klasse invites to add one
  const empty = status === 'all' ? withLists.filter((d) => fits(d) && !entries.some((e) => e.discipline.id === d.id)) : []

  const filterable = plan.length > 1 || entries.length > 0
  // the active filters, named on the closed toggle so a filtered list never looks incomplete
  const active = [subject !== 'all' && subject, status !== 'all' && STATUS_LABEL[status]].filter(Boolean).join(', ')

  return (
    <>
      {filterable && (
        <button
          type="button"
          aria-expanded={filterOpen}
          aria-controls="plan-filters"
          onClick={() => setFilterOpen((o) => !o)}
          className={`flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-bold text-slate-600 hover:bg-slate-100 ${focusClass}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 5h18l-7 8.5V19l-4 2v-7.5z" />
          </svg>
          Filter{active && <span className="font-normal text-player">· {active}</span>}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={filterOpen ? 'rotate-180' : ''}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
      <div id="plan-filters" hidden={!filterOpen} className="flex flex-wrap gap-x-4 gap-y-2">
        {plan.length > 1 && (
          <Chips
            label="Fach"
            value={subject}
            onChange={setSubject}
            options={[
              ['all', 'Alle'],
              ...plan.map(
                (s) =>
                  [
                    s.subject,
                    <span key={s.subject} className="inline-flex items-center gap-1.5">
                      <SubjectTag subject={s.subject} decorative />
                      {s.subject}
                    </span>,
                  ] as const,
              ),
            ]}
          />
        )}
        {entries.length > 0 && <Chips label="Status" value={status} onChange={setStatus} options={[['all', 'Alle'], ...STATUS_ORDER.map((s) => [s, STATUS_LABEL[s]] as const)]} />}
      </div>
      {shown.map((e) => (
        <ListCard key={e.list.id} discipline={e.discipline} list={e.list} rounds={e.rounds} status={e.status} days={e.days} />
      ))}
      {empty.map((d) => (
        <article key={d.id} className={`${STICKER} p-5`} aria-label={d.name}>
          <ListLabel discipline={d} />
          <p className="mt-1 text-slate-600">
            Noch keine {d.id === 'vocabulary' ? 'Vokabelliste' : 'Wörterliste'} für Klasse {player.grade}. Fotografiere die Liste aus der Schule.
          </p>
          <ButtonLink className="mt-4" to={d.id === 'word-dictation' ? paths.newWordList : `${paths.newWordList}?discipline=${d.id}`}>
            + Neue {d.id === 'vocabulary' ? 'Vokabelliste' : 'Wörterliste'}
          </ButtonLink>
        </article>
      ))}
      {soon.map((d) => (
        <article key={d.id} aria-label={d.name} className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-5 py-4 text-slate-500">
          <ListLabel discipline={d} />
          <p className="mt-0.5 text-lg font-bold">kommt später</p>
        </article>
      ))}
      {shown.length === 0 && soon.length === 0 && empty.length === 0 && <p className="text-slate-600">Nichts für diesen Filter.</p>}
    </>
  )
}

/** Upcoming tests first (the next one on top), then the other lists by date, newest first. */
function chronological(a: { list: WordList; days: number | null }, b: { list: WordList; days: number | null }): number {
  const next = upcoming(a.days) - upcoming(b.days)
  if (!Number.isNaN(next) && next !== 0) return next
  return (b.list.test_date ?? b.list.created_at).localeCompare(a.list.test_date ?? a.list.created_at)
}

/** Lists without a test date, or with a past one, go after the upcoming tests. */
const upcoming = (days: number | null) => (days === null || days < 0 ? Infinity : days)

/** A row of filter chips; the pressed one is the filter. */
function Chips<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, ReactNode])[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      {/* one width for both labels, so the chips of both rows start in one column; on phones the
          chips need the room, the group's name still tells screen readers */}
      <span className="sr-only text-sm text-slate-500 sm:not-sr-only sm:w-14">{label}</span>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`min-h-11 rounded-full px-3 text-sm font-bold sm:px-4 ${value === id ? 'bg-player text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} ${focusClass}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/** One list: the whole card opens its Spielvorbereitung (one link stretched over it); the bar only shows. */
function ListCard({ discipline, list, rounds, status, days }: { discipline: Discipline; list: WordList; rounds: WordList['rounds']; status: ListStatus; days: number | null }) {
  return (
    // one 12px frame around everything: the bar touches it, the text adds px-2
    <article
      className={`relative space-y-3 p-3 transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,.15),0_14px_30px_rgba(0,0,0,.2)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${STICKER}`}
      aria-label={list.title}
    >
      <div className="px-2 pt-2">
        {/* label and badges share the first line; the label gives way */}
        <div className="flex items-center gap-2">
          <ListLabel discipline={discipline} className="flex-1" />
          <ListBadges status={status} days={days} />
        </div>
        <h2 className="mt-0.5 truncate text-xl leading-tight font-bold">
          <Link
            to={paths.training(list.id)}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-player focus-visible:after:ring-offset-2"
          >
            {list.title}
          </Link>
        </h2>
      </div>
      <div className="flex items-center gap-2 pb-1">
        <RoundsBar list={list} rounds={rounds} className="h-6 flex-1" />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </article>
  )
}
