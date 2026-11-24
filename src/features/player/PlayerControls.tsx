import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { focusClass } from '../../components/styles'
import { heroStyle, type PlayerScheme } from '../children/schemes'
import { HeroPattern } from './PlayerCrest'
import { POSITIONS, type PositionId } from './positions'

/** The real radio lies invisibly over its tile: it is the tap target and keeps keyboard and screen readers working. */
export const radioCover = 'absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0'

/**
 * The shirt number as two rolls like a scoreboard (tens, ones): ▲/▼, swiping up or down, the arrow
 * keys or typing a digit. Each roll is a spinbutton, so screen readers and keyboards keep working.
 * Without a number both show a dash; the first change starts from 0.
 */
export function NumberRoller({ value, onChange, printed = false }: { value: number | null; onChange: (value: number) => void; printed?: boolean }) {
  const tens = value === null ? null : Math.floor(value / 10)
  const ones = value === null ? null : value % 10
  return (
    <div className="flex gap-1.5">
      <DigitRoll label="Zehner" digit={tens} printed={printed} onChange={(d) => onChange(d * 10 + (ones ?? 0))} />
      <DigitRoll label="Einer" digit={ones} printed={printed} onChange={(d) => onChange((tens ?? 0) * 10 + d)} />
    </div>
  )
}

const ROLL_STEP_PX = 24

function DigitRoll({ label, digit, printed, onChange }: { label: string; digit: number | null; printed: boolean; onChange: (digit: number) => void }) {
  const reduceMotion = useReducedMotion() ?? false
  // the new digit rolls in from below when counting up, from above when counting down
  const [direction, setDirection] = useState<1 | -1>(1)
  const dragY = useRef<number | null>(null)
  const step = (by: 1 | -1) => {
    setDirection(by)
    onChange(((digit ?? 0) + by + 10) % 10)
  }
  // printed: quiet arrows, clearer while the roll is touched or focused (swiping is the main way)
  const arrow = `grid cursor-pointer place-items-center rounded-lg active:scale-95 ${printed ? 'h-[12cqw] min-h-7 w-[22cqw] text-[6cqw] opacity-35 transition-opacity group-hover:opacity-80 group-focus-within:opacity-80' : 'h-11 w-12 text-slate-500 hover:bg-slate-100'}`
  return (
    <div className="group flex flex-col items-center">
      <button type="button" tabIndex={-1} aria-hidden onClick={() => step(1)} className={arrow}>
        ▲
      </button>
      <div
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={9}
        aria-valuenow={digit ?? undefined}
        aria-valuetext={digit === null ? 'keine' : String(digit)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            step(e.key === 'ArrowUp' ? 1 : -1)
          } else if (/^[0-9]$/.test(e.key)) {
            setDirection(1)
            onChange(Number(e.key))
          }
        }}
        // swiping up counts up, one digit per step of the finger
        onPointerDown={(e) => {
          dragY.current = e.clientY
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (dragY.current === null) return
          const dy = dragY.current - e.clientY
          if (Math.abs(dy) < ROLL_STEP_PX) return
          step(dy > 0 ? 1 : -1)
          dragY.current = e.clientY
        }}
        onPointerUp={() => (dragY.current = null)}
        onPointerCancel={() => (dragY.current = null)}
        // printed: the digit in the shirt's text colour, as on the back of a shirt; else a scoreboard tile
        className={`relative grid cursor-ns-resize touch-none place-items-center overflow-hidden rounded-xl font-display font-extrabold select-none ${printed ? 'h-[34cqw] w-[22cqw] text-[32cqw] leading-none' : 'h-16 w-12 bg-[#0b1b3a] text-4xl text-white'} ${focusClass}`}
      >
        <motion.span key={digit ?? 'none'} initial={reduceMotion ? false : { y: `${direction * 70}%`, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.16 }}>
          {digit ?? '–'}
        </motion.span>
      </div>
      <button type="button" tabIndex={-1} aria-hidden onClick={() => step(-1)} className={arrow}>
        ▼
      </button>
    </div>
  )
}

/** Where each position lies on the pitch (own goal at the bottom), in % of its height. */
const ZONES: Record<PositionId, { top: string; height: string }> = {
  sturm: { top: '3%', height: '20%' },
  mittelfeld: { top: '24%', height: '25%' },
  abwehr: { top: '51%', height: '25%' },
  tor: { top: '77%', height: '20%' },
}

/**
 * The position on a pitch seen from above, upright (attack at the opponent's box on top, own goal
 * at the bottom). It takes whatever size it gets: the markings stretch, the centre circle stays
 * round. Each zone is a radio; the chosen one holds the player's shirt in miniature (club kit,
 * shirt number or initial), which runs to a new zone.
 */
export function PositionPitch({ value, onChange, marker, scheme, className = '' }: { value: PositionId; onChange: (value: PositionId) => void; marker: string; scheme: PlayerScheme; className?: string }) {
  const markerId = `marker${useId()}`
  const reduceMotion = useReducedMotion() ?? false
  return (
    <div className={`relative min-h-56 w-full overflow-hidden rounded-xl bg-[#1e6b35] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.06)_0_10%,transparent_10%_20%)] ${className}`}>
      <PitchLines />
      {POSITIONS.map((position) => {
        const chosen = value === position.id
        return (
          <label
            key={position.id}
            style={ZONES[position.id]}
            className="absolute inset-x-[5%] flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg font-display text-xs font-bold tracking-wide text-white/85 uppercase transition-colors hover:bg-white/8 has-checked:bg-white/12 has-checked:text-white has-checked:ring-2 has-checked:ring-white/80 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-white"
          >
            <input type="radio" name="position" value={position.id} checked={chosen} onChange={() => onChange(position.id)} aria-label={position.label} className={radioCover} />
            {chosen && (
              // the player on the pitch: the shirt in miniature, one marker that runs to the new zone
              <motion.span layoutId={markerId} transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }} aria-hidden className="block">
                <MiniShirt scheme={scheme} label={marker} />
              </motion.span>
            )}
            {position.label}
          </label>
        )
      })}
    </div>
  )
}

/** Pitch markings that stretch with the pitch (lines keep their width); the centre circle is HTML so it stays round. */
function PitchLines() {
  const line = { fill: 'none', stroke: 'rgba(255,255,255,.45)', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' } as const
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <rect x="4" y="2.5" width="92" height="95" {...line} />
        <line x1="4" y1="50" x2="96" y2="50" {...line} />
        {/* the opponent's box on top, the own one at the bottom */}
        <rect x="20" y="2.5" width="60" height="14" {...line} />
        <rect x="35" y="2.5" width="30" height="5" {...line} />
        <rect x="20" y="83.5" width="60" height="14" {...line} />
        <rect x="35" y="92.5" width="30" height="5" {...line} />
        <rect x="40" y="0.5" width="20" height="2" {...line} />
        <rect x="40" y="97.5" width="20" height="2" {...line} />
      </svg>
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[34%] -translate-1/2 rounded-full border-[1.5px] border-white/45" />
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-white/45" />
    </>
  )
}

/** The club's shirt as a small marker with the number printed on it. */
function MiniShirt({ scheme, label }: { scheme: PlayerScheme; label: string }) {
  const { backgroundImage, color } = heroStyle(scheme)
  return (
    <span className="relative block h-9 w-11 drop-shadow-[0_2px_3px_rgba(0,0,0,.45)]">
      <span className="absolute inset-0 overflow-hidden" style={{ backgroundImage, clipPath: SHIRT }}>
        <HeroPattern scheme={scheme} />
      </span>
      <span className="absolute inset-x-0 top-[28%] text-center font-display text-base leading-none font-extrabold" style={{ color }}>
        {label}
      </span>
    </span>
  )
}

/** A shirt seen from the back (shoulders, sleeves, collar). */
const SHIRT = 'polygon(31% 0, 69% 0, 100% 13%, 93% 36%, 81% 30%, 81% 100%, 19% 100%, 19% 30%, 7% 36%, 0 13%)'

/**
 * The back of the club's shirt: its colour, kit pattern and text colour, like the card picture.
 * Children (name, number) are printed on the torso.
 */
export function ShirtBack({ scheme, className = '', children }: { scheme: PlayerScheme; className?: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <div className={`@container relative mx-auto w-full max-w-[17rem] drop-shadow-[0_6px_10px_rgba(11,27,58,.25)] ${className}`}>
      <div className="relative overflow-hidden px-[21%] pt-[16%] pb-[4%] transition-colors duration-300" style={{ color: heroStyle(scheme).color, clipPath: SHIRT }}>
        {/* the new club's kit fades in over the old one */}
        <AnimatePresence initial={false}>
          <motion.div
            key={scheme.id}
            className="absolute inset-0"
            style={{ backgroundImage: heroStyle(scheme).backgroundImage }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
          >
            <HeroPattern scheme={scheme} />
          </motion.div>
        </AnimatePresence>
        {/* collar */}
        <span aria-hidden className="pointer-events-none absolute top-0 left-1/2 h-[7%] w-[22%] -translate-x-1/2 rounded-b-full bg-black/20" />
        <div className="relative">{children}</div>
      </div>
    </div>
  )
}
