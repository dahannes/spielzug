// Tailwind classes shared by components (kept out of component files for fast refresh).

export type Variant = 'primary' | 'secondary' | 'link'

export const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-player focus-visible:ring-offset-2'

/** Classes of a button, also for links and labels that look like one. */
export function buttonClass(variant: Variant = 'primary', className = ''): string {
  const styles = {
    primary: 'rounded-xl bg-player px-5 py-3 text-white hover:brightness-90 disabled:bg-slate-400',
    secondary: 'rounded-xl bg-white px-5 py-3 text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400',
    link: 'rounded-lg px-3 text-player hover:underline disabled:text-slate-400 disabled:no-underline',
  }[variant]
  return `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed ${focusClass} ${styles} ${className}`
}

export const controlClass =
  'block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base focus:border-player focus:outline-none focus:ring-2 focus:ring-player-soft'
