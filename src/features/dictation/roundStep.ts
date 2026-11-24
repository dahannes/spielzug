import { useEffect, useRef, useState } from 'react'

// Where a child is in an unfinished round (SR-22, SR-25): kept for the browser tab, so a reload or an
// app switch reopens the same step instead of the preparation. Only a convenience – losing it is harmless.

const key = (roundId: string) => `spielzug.round-step.${roundId}`

/** A second tap this soon after a step change belongs to the first one (double tap). */
export const TAP_GUARD_MS = 600

function load<T>(roundId: string, valid: (step: unknown) => step is T): T | null {
  try {
    const raw = sessionStorage.getItem(key(roundId))
    const step: unknown = raw ? JSON.parse(raw) : null
    return valid(step) ? step : null
  } catch {
    return null
  }
}

function save(roundId: string, step: unknown) {
  try {
    sessionStorage.setItem(key(roundId), JSON.stringify(step))
  } catch {
    // private mode or storage full: the round still works, it just starts over after a reload
  }
}

/**
 * The round's current step, restored after a reload. For TAP_GUARD_MS after a change the step
 * "settles": `advance` ignores taps, so a double tap moves one step, not two. Buttons show it as
 * `aria-disabled` (unstyled, so nothing flickers), which also makes automated clicks wait.
 */
export function useRoundStep<T>(roundId: string, initial: T, valid: (step: unknown) => step is T) {
  const [restored] = useState(() => load(roundId, valid))
  const [step, setStep] = useState<T>(restored ?? initial)
  const [settling, setSettling] = useState(false)
  const settlingRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function set(next: T) {
    save(roundId, next)
    setStep(next)
    settlingRef.current = true
    setSettling(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      settlingRef.current = false
      setSettling(false)
    }, TAP_GUARD_MS)
  }

  /** Runs `change` unless the step is still settling from the last change. */
  function advance(change: () => void) {
    if (!settlingRef.current) change()
  }

  return { step, set, advance, settling, restored: restored !== null }
}
