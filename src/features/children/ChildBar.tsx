import { Link } from 'react-router'
import { paths } from '../../app/paths'
import { focusClass } from '../../components/styles'
import { Card } from '../../components/ui'
import type { Child } from './queries'

/** "Wer übt?": pick whose progress the lists show. Players are created and edited on their cards. */
export function ChildBar({ kids, current, onChoose }: { kids: Child[]; current: Child | undefined; onChoose: (id: string) => void }) {
  if (kids.length === 0) {
    return (
      <Card>
        <p className="text-slate-600">
          Noch kein Spieler.{' '}
          <Link to={paths.home} className="font-semibold text-player underline">
            Leg zuerst auf der Startseite einen Spieler an.
          </Link>
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Wer übt?">
      <span className="mr-1 text-sm text-slate-600">Wer übt?</span>
      {kids.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={c.id === current?.id}
          onClick={() => onChoose(c.id)}
          className={`min-h-10 rounded-full px-4 font-semibold ${focusClass} ${
            c.id === current?.id ? 'bg-player text-white' : 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}
