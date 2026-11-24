import { useMutation } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useImperativeHandle, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { SwipeRow } from '../../components/SwipeRow'
import { Button, ConfirmButton, Dialog, DialogFooter, ErrorText } from '../../components/ui'
import { useDeletePlayer, usePlayerPhoto, useSaveChild, type Child } from '../children/queries'
import { heroStyle, PLAYER_SCHEMES, playerScheme, playerSchemeId, type PlayerScheme, type PlayerSchemeId } from '../children/schemes'
import { LEAGUES, leagueOf } from '../../../shared/league'
import { errorText } from '../../lib/apiError'
import { useCardStats } from './card'
import { CardFace } from './CardFace'
import { NumberRoller, PositionPitch, radioCover, ShirtBack } from './PlayerControls'
import { positionId, type PositionId } from './positions'
import { CardSwiper } from './CardSwiper'
import { clubOpen, useEarnedLeague } from './league'
import { LeagueName } from './LeaguePanel'
import { PlayerCrest, TierStars } from './PlayerCrest'

const GRADES = [1, 2, 3, 4, 5, 6]

const legendClass = 'w-full text-center text-sm font-bold text-slate-700'
/** Game UI: controls that explain themselves (crests, shirt, pitch) keep their name for screen readers only. */
const hiddenLegend = 'sr-only'

/** The modal's card: handed back to the page when the modal goes. */
export interface CardEditor {
  release(): void
}

/** Tilt of the preview card in degrees; `--card-tilt` in index.css must match (the form panel's overlap uses it). */
const CARD_TILT = 1.5


/** Radio buttons that look like tiles; native inputs keep arrow keys and screen readers working. */
const tileClass = 'relative cursor-pointer has-checked:ring-[3px] has-checked:ring-slate-900 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-player'

/**
 * Create or edit a player card (wireframes T7/T8): live preview next to the form. Trainers set the
 * grade (Klasse) and the photo; a player editing their own card sees the grade but cannot change
 * either. The photo is cut out and redrawn on the device; only that drawing is saved (ADR-032).
 * Clubs above the player's league are locked (SR-63); trainers can set the league.
 */
export function PlayerForm({
  familyId,
  team,
  child,
  trainer,
  title,
  floatingPreview = false,
  layoutId,
  ref,
  onSaved,
  onCancel,
  onDeleted,
}: {
  familyId: string
  team: string
  child?: Child
  /** Trainers set grade and photo. */
  trainer: boolean
  title?: string
  /** The modal layout: the card on its own layer, the form panel scrolling over it and covering its stats. */
  floatingPreview?: boolean
  /** Shared with the card on the page: Motion flies it from there into the modal and back (layoutId). */
  layoutId?: string
  ref?: Ref<CardEditor>
  onSaved: (id: string) => void
  onCancel?: () => void
  /** Offers "Spieler löschen" (trainers, existing players). */
  onDeleted?: () => void
}) {
  const save = useSaveChild(familyId)
  const remove = useDeletePlayer(familyId)
  const [name, setName] = useState(child?.name ?? '')
  const [shirtNumber, setShirtNumber] = useState<number | null>(child?.shirt_number ?? null)
  const [position, setPosition] = useState<PositionId>(positionId(child?.position))
  const [grade, setGrade] = useState<number | null>(child?.grade ?? null)
  const [color, setColor] = useState<PlayerSchemeId>(playerSchemeId(child?.color))
  const [league, setLeague] = useState(child?.league ?? 1)
  // a trainer can set the league, but not below what the rounds earned (the app would raise it again)
  const earned = useEarnedLeague(familyId, child?.id)
  const worn = playerSchemeId(child?.color)
  const isOpen = (scheme: PlayerScheme) => clubOpen(scheme, league, worn)
  function chooseLeague(level: number) {
    setLeague(level)
    // a club that a lower league locks goes back to the one the player wears
    if (!clubOpen(playerScheme(color), level, worn)) setColor(worn)
  }
  // the club changes by the row or by swiping the card; the card slides in from the side the club comes from
  const [clubDirection, setClubDirection] = useState<1 | -1>(1)
  const clubIndex = PLAYER_SCHEMES.findIndex((scheme) => scheme.id === color)
  function chooseClub(id: PlayerSchemeId) {
    setClubDirection(PLAYER_SCHEMES.findIndex((scheme) => scheme.id === id) < clubIndex ? -1 : 1)
    setColor(id)
  }
  /** The next club in that direction the player may wear: locked ones are skipped (SR-63). */
  const nextOpen = (direction: 1 | -1) => {
    for (let i = clubIndex + direction; i >= 0 && i < PLAYER_SCHEMES.length; i += direction) if (isOpen(PLAYER_SCHEMES[i])) return PLAYER_SCHEMES[i]
    return undefined
  }
  function swipeClub(direction: 1 | -1) {
    const next = nextOpen(direction)
    if (!next) return
    setClubDirection(direction)
    setColor(next.id)
  }
  const pressedOutside = useRef(false)
  const isOutside = (target: EventTarget) => target instanceof Element && !target.closest('form, [data-card]')
  const stats = useCardStats(familyId, { id: child?.id, grade: child?.grade ?? null })
  const reduceMotion = useReducedMotion() ?? false
  // handed back: the page renders the card again (same layoutId) and Motion flies it there
  const [released, setReleased] = useState(false)
  useImperativeHandle(ref, () => ({ release: () => setReleased(true) }))
  const stored = usePlayerPhoto(child?.photo_path)
  // undefined: keep the stored photo; null: remove it; else the new drawing to save
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null | undefined>(undefined)
  const shownPhoto = photo === undefined ? stored : photo?.url
  const fileInput = useRef<HTMLInputElement>(null)
  const draw = useMutation({
    mutationFn: async (file: Blob) => (await import('../../lib/photo/stylize')).stylizePortrait(file),
    onSuccess: (blob) => setPhoto({ blob, url: URL.createObjectURL(blob) }),
  })
  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (grade === null) return
    save.mutate(
      { id: child?.id, name, shirtNumber, position, color, grade, league: trainer ? league : undefined, photo: photo === undefined ? undefined : (photo?.blob ?? null), previousPhoto: child?.photo_path },
      { onSuccess: onSaved },
    )
  }

  // the clubs by rarity, with a divider (its tier number) between two tiers
  const clubItems = PLAYER_SCHEMES.flatMap((scheme, i) => (i > 0 && PLAYER_SCHEMES[i - 1].tier !== scheme.tier ? [scheme.tier, scheme.id] : [scheme.id]))
  // in the modal the buttons stick to the bottom; on the page they just end the form
  const Actions = floatingPreview ? DialogFooter : PageActions
  const fields = (
    <div className="min-w-0 space-y-6">
        {/* min-w-0: a fieldset is as wide as its content by default, the row would stretch the form */}
        <fieldset className="min-w-0">
          <legend className={hiddenLegend}>Verein</legend>
          {/* one row to swipe through: the list will grow */}
          <SwipeRow className="mt-1 -mx-1" activeIndex={clubItems.findIndex((item) => item === color)} onStep={swipeClub}>
            {clubItems.map((item) =>
              typeof item === 'number' ? (
                // a thin divider where the next rarity starts
                <div key={`tier-${item}`} aria-hidden className="mx-0.5 w-px shrink-0 self-stretch bg-slate-200" />
              ) : (
                <ClubTile key={item} schemeId={item} checked={color === item} locked={!isOpen(playerScheme(item))} onChoose={() => chooseClub(item)} />
              ),
            )}
          </SwipeRow>
          {league < LEAGUES.length && (
            <p className="mt-1 text-center text-sm text-slate-500">🔒 Mehr Vereine gibt es mit dem Aufstieg in die {leagueOf(league + 1).name}.</p>
          )}
        </fieldset>
        {/* side by side like a line-up board: the shirt (name, number) and where it plays */}
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-stretch gap-3">
          <fieldset className="min-w-0">
            <legend className={hiddenLegend}>Trikot</legend>
            <ShirtBack scheme={playerScheme(color)}>
              <input
                aria-label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                placeholder="Name"
                className="w-full min-w-0 border-b-2 border-current/40 bg-transparent py-1 text-center font-display text-[11cqw] font-extrabold tracking-wide uppercase placeholder:text-current/45 focus:border-current focus:outline-none"
              />
              <div className="mt-[3cqw] flex justify-center" aria-label="Nummer" role="group">
                <NumberRoller value={shirtNumber} onChange={setShirtNumber} printed />
              </div>
            </ShirtBack>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className={hiddenLegend}>Position</legend>
            <PositionPitch value={position} onChange={setPosition} marker={shirtNumber?.toString() ?? (name.trim().slice(0, 1).toUpperCase() || '?')} scheme={playerScheme(color)} className="h-full" />
          </fieldset>
        </div>
        {trainer && (
          <fieldset>
            <legend className={legendClass}>Klasse</legend>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {GRADES.map((g) => (
                <label key={g} className={`grid size-12 place-items-center rounded-xl bg-white text-lg font-black ring-1 ring-slate-300 ${tileClass}`}>
                  <input type="radio" name="grade" value={g} checked={grade === g} onChange={() => setGrade(g)} required className={radioCover} />
                  {g}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {trainer && (
          <fieldset>
            <legend className={legendClass}>Liga</legend>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {LEAGUES.map((l) => (
                <label
                  key={l.level}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-xl bg-white px-3 py-1 text-sm font-bold ring-1 ring-slate-300 has-disabled:cursor-not-allowed has-disabled:opacity-40 ${tileClass}`}
                >
                  <input type="radio" name="league" value={l.level} checked={league === l.level} disabled={l.level < earned} onChange={() => chooseLeague(l.level)} className={radioCover} />
                  <LeagueName level={l.level} className="flex-col gap-0.5" />
                </label>
              ))}
            </div>
            {earned > 1 && <p className="mt-1 text-center text-sm text-slate-500">Erspielt: {leagueOf(earned).name}. Tiefer geht es nicht.</p>}
          </fieldset>
        )}
        {trainer && (
          <fieldset>
            <legend className={legendClass}>Foto</legend>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
              {shownPhoto && (
                <img src={shownPhoto} alt="Gezeichnetes Foto" className="h-20 rounded-lg p-1" style={heroStyle(playerScheme(color))} />
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-label="Foto auswählen"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) draw.mutate(file)
                }}
              />
              <Button variant="secondary" disabled={draw.isPending} onClick={() => fileInput.current?.click()}>
                📷 {shownPhoto ? 'Neues Foto' : 'Foto aufnehmen oder wählen'}
              </Button>
              {shownPhoto && (
                <Button variant="link" className="px-0 text-sm font-normal text-slate-500" disabled={draw.isPending} onClick={() => setPhoto(null)}>
                  Foto entfernen
                </Button>
              )}
            </div>
            {draw.isPending && (
              <p role="status" className="mt-2 text-sm text-slate-600">
                Ich zeichne das Foto …
              </p>
            )}
            <ErrorText>
              {draw.isError &&
                (draw.error.name === 'NoPersonError'
                  ? 'Auf dem Foto ist niemand zu erkennen. Am besten Kopf und Schultern vor einem ruhigen Hintergrund.'
                  : 'Das Foto konnte nicht verarbeitet werden.')}
            </ErrorText>
            <p className="mt-1 text-center text-xs text-slate-500">Das Foto bleibt auf diesem Gerät; gespeichert wird nur die gezeichnete Version.</p>
          </fieldset>
        )}
        <ErrorText>{save.isError ? 'Die Spielerkarte konnte nicht gespeichert werden.' : remove.isError ? errorText(remove.error) : null}</ErrorText>
        {/* rare and destructive: at the end of the form, not in the always visible footer */}
        {trainer && child && onDeleted && (
          <ConfirmButton
            variant="link"
            className="px-0 text-sm font-normal text-slate-500 hover:text-red-700"
            disabled={remove.isPending || save.isPending}
            question={`${child.name} löschen? Alle Runden, Fotos vom Blatt und das Spielerfoto werden gelöscht. Die Wörterlisten bleiben.`}
            confirmLabel="Spieler löschen"
            onConfirm={() => remove.mutate(child.id, { onSuccess: onDeleted })}
          >
            Spieler löschen
          </ConfirmButton>
        )}
        <Actions>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
          <Button type="submit" disabled={!name.trim() || grade === null || save.isPending || draw.isPending}>
            {save.isPending ? 'Speichere …' : child ? 'Speichern' : 'Spieler anlegen'}
          </Button>
        </Actions>
    </div>
  )

  const cardPreview = (
    <div className="flex flex-col items-center gap-2" aria-hidden>
      <span className="font-display text-sm font-bold tracking-[0.12em] text-slate-500 uppercase">Vorschau</span>
      <CardFace team={team} card={{ name, shirtNumber, position, grade, color }} photo={shownPhoto} stats={stats} />
    </div>
  )

  if (floatingPreview) {
    // two layers in the same column: the card lies still underneath, the sheet scrolls over it (index.css)
    return (
      <div
        className="player-editor-sheet"
        // a tap on no content (not the card, not the form) closes, like a tap on a backdrop
        onPointerDown={(e) => (pressedOutside.current = isOutside(e.target))}
        onClick={(e) => {
          if (pressedOutside.current && isOutside(e.target)) onCancel?.()
          pressedOutside.current = false
        }}
      >
        <div className="player-editor-layer" aria-hidden>
          <div className="player-editor-column">
            <div className="player-editor-preview">
              {!released && (
                <motion.div data-card layoutId={layoutId} style={{ rotate: CARD_TILT }} transition={{ layout: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 } }}>
                  {/* swiping the card changes the club, in step with the club row */}
                  <CardSwiper itemKey={color} direction={clubDirection} onSwipe={swipeClub} canSwipe={(dir) => !!nextOpen(dir)} className="pointer-events-auto">
                    <CardFace team={team} card={{ name, shirtNumber, position, grade, color }} photo={shownPhoto} stats={stats} className="w-full" />
                  </CardSwiper>
                </motion.div>
              )}
            </div>
          </div>
        </div>
        <div className="player-editor-column">
          <div className="player-editor-preview" data-slot aria-hidden />
          {/* the form slides, not the sheet: a transform on the sheet would carry the fixed card along */}
          <motion.form
            onSubmit={submit}
            variants={{ open: { y: 0 }, closed: { y: '100dvh' } }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
            className="player-editor-panel grid grid-cols-[minmax(0,1fr)] content-start gap-4"
          >
            <h2 className="mb-1 text-2xl font-black">{title}</h2>
            {fields}
          </motion.form>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {cardPreview}
      {fields}
    </form>
  )
}

/**
 * The player form as a modal; `child` undefined creates a new player. With `origin` the card is
 * picked up from the page: the caller hides its own card while the modal is open and shows it again
 * on `onClose`, when the card is back.
 */
export function PlayerDialog({
  open,
  onClose,
  layoutId,
  ...form
}: {
  open: boolean
  onClose: () => void
  layoutId?: string
  familyId: string
  team: string
  child?: Child
  trainer: boolean
  onSaved?: (id: string) => void
}) {
  const title = form.child ? 'Spielerkarte bearbeiten' : 'Spieler anlegen'
  const editor = useRef<CardEditor>(null)
  // the modal lets go of the card in the same commit in which the page takes it back
  function close(then?: () => void) {
    editor.current?.release()
    onClose()
    then?.()
  }
  return (
    <Dialog open={open} onClose={() => close()} label={title} presentation="stage" animateSelf={false}>
      <PlayerForm
        {...form}
        ref={editor}
        layoutId={layoutId}
        title={title}
        floatingPreview
        onCancel={() => close()}
        onDeleted={form.trainer ? onClose : undefined}
        onSaved={(id) => close(() => form.onSaved?.(id))}
      />
    </Dialog>
  )
}

/** One club in the picker: crest, name, rarity. The native radio lies over it. */
function ClubTile({ schemeId, checked, locked, onChoose }: { schemeId: PlayerSchemeId; checked: boolean; locked: boolean; onChoose: () => void }) {
  const scheme = playerScheme(schemeId)
  const reduceMotion = useReducedMotion() ?? false
  return (
    // just the crest, no card: the chosen one is bigger and named, the others step back a little
    <label
      className={`relative flex w-24 shrink-0 cursor-pointer flex-col items-center gap-1 rounded-xl px-1 pt-2 pb-1.5 text-center text-xs leading-tight font-bold transition-opacity has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-player ${checked ? 'text-slate-900' : locked ? 'cursor-not-allowed text-slate-500' : 'text-slate-500 opacity-60 hover:opacity-100'}`}
    >
      <input
        type="radio"
        name="color"
        value={scheme.id}
        checked={checked}
        disabled={locked}
        onChange={onChoose}
        aria-label={locked ? `${scheme.label}, ab der ${leagueOf(scheme.tier).name}` : scheme.label}
        className={radioCover}
      />
      {/* the chosen crest springs to full size, the others stay at two thirds */}
      <motion.span
        className="pointer-events-none block size-24"
        initial={false}
        animate={{ scale: checked ? 1 : 0.66 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14 }}
      >
        <PlayerCrest schemeId={scheme.id} className={`size-24 ${locked ? 'opacity-35 grayscale' : ''}`} />
      </motion.span>
      {/* locked: a padlock on the greyed crest, the stars say from which league */}
      {locked && (
        <span className="pointer-events-none absolute top-2 left-1/2 flex size-24 -translate-x-1/2 flex-col items-center justify-center gap-1" aria-hidden>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0b1b3a" strokeWidth="2.2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" fill="#ffffff" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          <TierStars tier={scheme.tier} className="text-[10px]" />
        </span>
      )}
      {/* only the chosen club shows its name and stars; the space stays, so the row does not jump */}
      <span className={`-mt-1 flex flex-col items-center gap-1 ${checked ? '' : 'invisible'}`} aria-hidden>
        {scheme.label}
        <TierStars tier={scheme.tier} className="text-[10px]" />
      </span>
    </label>
  )
}

function PageActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2 pt-1">{children}</div>
}
