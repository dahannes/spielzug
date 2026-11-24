import { animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from 'motion/react'
import { Children, useEffect, useEffectEvent, useRef, type MouseEvent, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import { focusClass } from './styles'

/** Movement before a press counts as a drag (sideways) or is left to the page (up/down: scrolling). */
const LOCK_PX = 8
/** How far a flick carries on, in seconds of its speed (like Motion's inertia power). */
const FLICK_S = 0.25

/**
 * A row of items that is dragged sideways with finger or mouse and snaps to an item (ADR-038).
 * The items stay ordinary controls: a tap selects, a drag never does; keyboard focus and
 * `activeIndex` bring an item into view. Wheel and trackpad move it too; on a fine pointer
 * arrow buttons page through it – or, with `onStep`, choose the previous/next item.
 *
 * Plain pointer events, not Motion's `drag`, like `CardSwiper`: inside a scrolling sheet iOS takes
 * a slightly diagonal swipe as scrolling and cancels the pointer, which ended Motion's drag halfway.
 * Here the first few pixels decide: sideways the row captures the pointer, up/down it lets go.
 */
export function SwipeRow({ children, activeIndex, onStep, className = '' }: { children: ReactNode; activeIndex?: number; onStep?: (direction: 1 | -1) => void; className?: string }) {
  const viewport = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const reduceMotion = useReducedMotion() ?? false
  const dragged = useRef(false)
  const shown = useRef(false)
  const animation = useRef<AnimationPlaybackControls | null>(null)
  // the press: where it started, whether it is a drag yet, and the last sample for the flick speed
  const press = useRef<{ id: number; x: number; y: number; from: number; dragging: boolean; t: number; lastX: number; v: number } | null>(null)

  /** How far the row can move left (≤ 0). */
  const minX = () => Math.min(0, (viewport.current?.clientWidth ?? 0) - (track.current?.scrollWidth ?? 0))
  const clamp = (value: number) => Math.max(minX(), Math.min(0, value))
  /** Past an end the row only gives a little. */
  const elastic = (value: number) => {
    const limited = clamp(value)
    return limited + (value - limited) * 0.15
  }
  /** Distance between two items, to snap to. */
  const step = () => {
    const [first, second] = Array.from(track.current?.children ?? []) as HTMLElement[]
    return first && second ? second.offsetLeft - first.offsetLeft : (first?.offsetWidth ?? 1)
  }
  const moveTo = (value: number, instant = reduceMotion) => {
    animation.current?.stop()
    if (instant) x.set(clamp(value))
    else animation.current = animate(x, clamp(value), { type: 'spring', stiffness: 400, damping: 40 })
  }
  const snap = (value: number) => {
    const s = step()
    moveTo(Math.round(value / s) * s)
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    dragged.current = false
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: x.get(), dragging: false, t: e.timeStamp, lastX: e.clientX, v: 0 }
  }
  function onPointerMove(e: PointerEvent) {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    const dx = e.clientX - p.x
    if (!p.dragging) {
      const dy = e.clientY - p.y
      if (Math.abs(dy) >= LOCK_PX && Math.abs(dy) > Math.abs(dx)) press.current = null // up/down: the page scrolls
      if (Math.abs(dx) < LOCK_PX || Math.abs(dx) <= Math.abs(dy)) return
      p.dragging = dragged.current = true
      animation.current?.stop()
      p.from = x.get() - dx
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const dt = e.timeStamp - p.t
    if (dt > 0) p.v = ((e.clientX - p.lastX) / dt) * 1000
    p.t = e.timeStamp
    p.lastX = e.clientX
    x.set(elastic(p.from + dx))
  }
  function onPointerUp(e: PointerEvent) {
    const p = press.current
    press.current = null
    if (!p?.dragging) return
    // a pause before letting go is no flick
    const v = e.timeStamp - p.t > 80 || reduceMotion ? 0 : p.v
    snap(x.get() + v * FLICK_S)
  }
  function onPointerCancel() {
    if (press.current?.dragging) snap(x.get())
    press.current = null
  }

  /** Centres an item; the first time without animation. */
  function reveal(item: HTMLElement | undefined, instant = false) {
    if (!item || !viewport.current) return
    const left = item.offsetLeft + x.get()
    const right = left + item.offsetWidth
    const width = viewport.current.clientWidth
    if (!instant && left >= 0 && right <= width) return
    moveTo(-(item.offsetLeft - (width - item.offsetWidth) / 2), instant || undefined)
  }

  const revealActive = useEffectEvent((index: number) => {
    reveal(track.current?.children[index] as HTMLElement | undefined, !shown.current)
    shown.current = true
  })
  // passive: in a modal, the dialog is shown (layout effect, parent after child) before this measures
  useEffect(() => {
    if (activeIndex !== undefined && activeIndex >= 0) revealActive(activeIndex)
  }, [activeIndex])

  const onWheel = (e: WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
    if (delta) {
      animation.current?.stop()
      x.set(clamp(x.get() - delta))
    }
  }
  const page = (direction: 1 | -1) => snap(x.get() - direction * (viewport.current?.clientWidth ?? 0) * 0.8)
  // the row's width changes (rotation, fonts): stay within the ends
  useEffect(() => {
    const observer = new ResizeObserver(() => x.set(clamp(x.get())))
    for (const element of [viewport.current, track.current]) if (element) observer.observe(element)
    return () => observer.disconnect()
  }, [x])

  return (
    <div className={`relative min-w-0 ${className}`}>
      {/* clip, not hidden: focusing an item must not scroll the viewport behind the motion value's back */}
      <div ref={viewport} onWheel={onWheel} className="overflow-clip [mask-image:linear-gradient(90deg,transparent,#000_0.75rem,#000_calc(100%-0.75rem),transparent)]">
        <motion.div
          ref={track}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          // a drag ends with a click on the item under the pointer: swallow that one click, never a keyboard one (detail 0)
          onClickCapture={(e: MouseEvent) => {
            if (!dragged.current || e.detail === 0) return
            dragged.current = false
            e.preventDefault()
            e.stopPropagation()
          }}
          // keyboard focus only: a press focuses too, and an animation would fight the drag
          onFocus={(e) => {
            if (e.target.matches(':focus-visible')) reveal(Array.from(track.current?.children ?? []).find((item) => item.contains(e.target)) as HTMLElement | undefined)
          }}
          style={{ x }}
          // pan-y: the browser keeps up/down (the sheet scrolls), sideways belongs to the row
          className="flex w-max cursor-grab touch-pan-y gap-2 px-3 py-1.5 select-none active:cursor-grabbing"
        >
          {Children.toArray(children)}
        </motion.div>
      </div>
      <ArrowButton direction={-1} onClick={() => (onStep ? onStep(-1) : page(-1))} />
      <ArrowButton direction={1} onClick={() => (onStep ? onStep(1) : page(1))} />
    </div>
  )
}

/** Only for a mouse: touch users swipe, keyboard users tab or use the arrow keys. */
function ArrowButton({ direction, onClick }: { direction: 1 | -1; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={`absolute top-1/2 hidden size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 hover:bg-slate-50 pointer-fine:grid ${direction < 0 ? '-left-2' : '-right-2'} ${focusClass}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={direction < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}
