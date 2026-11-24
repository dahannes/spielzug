import type { CSSProperties } from 'react'
import { Link, Outlet } from 'react-router'
import { Logo } from '../components/Logo'
import { focusClass } from '../components/styles'
import { useChildren, useCurrentChild } from '../features/children/queries'
import { playerTheme } from '../features/children/schemes'
import { useFamily } from '../features/family/useFamily'
import { PromotionWatcher } from '../features/player/LeaguePanel'
import { paths } from './paths'

/** Frame: header on top, centred content, wider on tablet landscape; the player's scheme themes it. */
export function AppLayout() {
  const family = useFamily().data
  const { current } = useCurrentChild(useChildren(family?.id).data)

  return (
    <div className="flex min-h-dvh flex-col" style={playerTheme(current?.color) as CSSProperties}>
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to={paths.home} className={`flex items-center gap-2 rounded font-display text-2xl font-extrabold tracking-wide uppercase ${focusClass}`}>
            <Logo className="size-8" />
            Spielzug
          </Link>
          <Link
            to={paths.trainer}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold ring-1 ring-slate-400 hover:bg-slate-50 ${focusClass}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 018 0v3" />
            </svg>
            Trainer
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <PromotionWatcher />
    </div>
  )
}
