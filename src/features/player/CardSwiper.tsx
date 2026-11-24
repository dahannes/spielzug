import { useRef, useState, type ReactNode } from 'react'

/**
 * The player card's swipe: the card follows the finger with a slight tilt; past 60px it moves on
 * (`onSwipe`, 1 = next, -1 = previous) and the new card slides in from that side (`direction`,
 * set by the caller, keyed by `itemKey`). Where `canSwipe` says no, the card only gives a little.
 * A swipe ends with a click on whatever is under the finger: that click is swallowed.
 * Used for the players on the start page and the clubs in the editor.
 */
export function CardSwiper({
  itemKey,
  direction,
  onSwipe,
  canSwipe = () => true,
  className = '',
  children,
}: {
  itemKey: string
  direction: 1 | -1
  onSwipe: (direction: 1 | -1) => void
  canSwipe?: (direction: 1 | -1) => boolean
  className?: string
  children: ReactNode
}) {
  const [drag, setDrag] = useState<{ startX: number; dx: number } | null>(null)
  const swiped = useRef(false)

  function onPointerUp() {
    swiped.current = !!drag && Math.abs(drag.dx) > 60
    if (swiped.current && drag) {
      const to = drag.dx < 0 ? 1 : -1
      if (canSwipe(to)) onSwipe(to)
    }
    setDrag(null)
  }
  // at an end the card only gives a little
  const dx = drag ? (canSwipe(drag.dx < 0 ? 1 : -1) ? drag.dx : drag.dx / 4) : 0

  return (
    <div
      className={`touch-pan-y select-none ${className}`}
      onPointerDown={(e) => setDrag({ startX: e.clientX, dx: 0 })}
      onPointerMove={(e) => drag && setDrag({ ...drag, dx: e.clientX - drag.startX })}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      onClickCapture={(e) => {
        if (swiped.current) e.stopPropagation()
        swiped.current = false
      }}
    >
      <div
        key={itemKey}
        className={direction === 1 ? 'motion-safe:animate-[card-from-right_220ms_ease-out]' : 'motion-safe:animate-[card-from-left_220ms_ease-out]'}
        style={drag ? { transform: `translateX(${dx}px) rotate(${dx / 40}deg)` } : { transition: 'transform 150ms ease-out' }}
      >
        {children}
      </div>
    </div>
  )
}
