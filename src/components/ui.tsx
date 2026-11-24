import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { buttonClass, controlClass, focusClass, type Variant } from './styles'

const DIALOG_TRANSITION_MS = 240

export function Loading() {
  return (
    <div role="status" className="grid min-h-[40dvh] place-items-center text-slate-500">
      Lädt …
    </div>
  )
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />
}

export function ButtonLink({ variant = 'primary', className, ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />
}

/** "← …" back to an overview. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={`inline-block rounded text-sm font-medium text-player hover:underline ${focusClass}`}>
      ← {children}
    </Link>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} min-h-12 ${className}`} {...props} />
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>
}

/**
 * Native modal dialog: focus moves in and back, Escape closes, the page behind is inert.
 * A click on the backdrop closes it too (`closeOnBackdrop`), but only when the press also started
 * there, so selecting text from inside to outside does not close it. `onClose` runs in every case,
 * so the caller's state stays in sync. Motion slides it in from the bottom and back out (ADR-038);
 * motion children with `open`/`closed` variants follow it in and leave before it. While it leaves it
 * keeps showing what it showed last, even if the caller already cleared it.
 */
export function Dialog({
  open,
  onClose,
  label,
  size = 'wide',
  presentation = 'sheet',
  className = '',
  closeOnBackdrop = true,
  animateSelf = true,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  size?: 'compact' | 'wide'
  /** stage: the whole screen, transparent; the content lays out and animates its own layers. */
  presentation?: 'sheet' | 'fullscreen' | 'stage'
  className?: string
  closeOnBackdrop?: boolean
  /** false: only the backdrop fades; the content brings its own motion (`open`/`closed` variants or imperative). */
  animateSelf?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const pressedOnBackdrop = useRef(false)
  const reduceMotion = useReducedMotion() ?? false
  // closing: open is false but the exit animation still runs (state adjusted during render, no effect)
  const [closing, setClosing] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    setClosing(!open)
  }
  // what it showed last, for the way out
  const [last, setLast] = useState({ children, label })
  if (open && (last.children !== children || last.label !== label)) setLast({ children, label })
  // a layout effect: the content's effects can already measure the open dialog
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!open || !dialog || dialog.open) return
    // a stage focuses itself: focusing the first field would scroll its layers before they are in place
    dialog.toggleAttribute('autofocus', presentation === 'stage')
    dialog.showModal()
  }, [open, presentation])
  useEffect(() => {
    if (!open && !closing) return
    const root = document.documentElement
    const body = document.body
    const before = [root.style.overflow, body.style.overflow]
    root.style.overflow = body.style.overflow = 'hidden'
    return () => {
      ;[root.style.overflow, body.style.overflow] = before
    }
  }, [open, closing])

  // The backdrop belongs to the <dialog> element: a hit on it lies outside the dialog's box – on a
  // stage (which fills the screen) every hit on the dialog itself, i.e. on no content.
  const onBackdrop = (e: MouseEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || e.target !== ref.current) return false
    return presentation === 'stage' || e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom
  }
  const transition = { duration: reduceMotion ? 0.01 : DIALOG_TRANSITION_MS / 1000, ease: [0.25, 0.1, 0.25, 1] as const }
  // children with the same variant names join in: in after the sheet, out before it
  const variants = animateSelf
    ? {
        open: { opacity: 1, y: 0, '--backdrop': 1, transition: { ...transition, when: 'beforeChildren' } },
        closed: { opacity: 0, y: '100%', '--backdrop': 0, transition: { ...transition, when: 'afterChildren' } },
      }
    : { open: { '--backdrop': 1, transition }, closed: { '--backdrop': 0, transition } }
  const shown = open ? { children, label } : closing ? last : null
  return (
    <motion.dialog
      ref={ref}
      aria-label={shown?.label ?? label}
      data-presentation={presentation}
      data-size={size}
      variants={variants}
      initial="closed"
      animate={open ? 'open' : 'closed'}
      onAnimationComplete={(definition) => {
        if (definition !== 'closed' || open || !closing) return
        ref.current?.close()
        setClosing(false)
      }}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onPointerDown={(e) => {
        pressedOnBackdrop.current = onBackdrop(e)
      }}
      onClick={(e) => {
        if (closeOnBackdrop && pressedOnBackdrop.current && onBackdrop(e)) onClose()
        pressedOnBackdrop.current = false
      }}
      className={className}
    >
      {shown?.children}
    </motion.dialog>
  )
}

/**
 * The action row of a modal: it sticks to the bottom of what scrolls, so the buttons stay in reach
 * however long the content is. Spans the modal's 1.25rem padding and takes over its bottom padding
 * (safe area included).
 */
export function DialogFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-5 mb-[calc(-1*max(1.25rem,env(safe-area-inset-bottom)))] flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${className}`}
    >
      {children}
    </div>
  )
}

/** A button that asks before it acts – instead of window.confirm, which iOS web apps render poorly. */
export function ConfirmButton({
  children,
  question,
  confirmLabel,
  onConfirm,
  disabled,
  variant = 'secondary',
  className,
}: {
  children: ReactNode
  question: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
  variant?: Variant
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant={variant} className={className} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} label={confirmLabel} size="compact">
        <p className="text-lg text-slate-900">{question}</p>
        <DialogFooter className="mt-6">
          <Button variant="secondary" autoFocus onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button
            className="bg-red-700 hover:bg-red-800"
            onClick={() => {
              setOpen(false)
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
