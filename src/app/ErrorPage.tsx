import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '../components/ui'

/** Shown when a page crashes – instead of the router's English developer screen. */
export function ErrorPage() {
  const error = useRouteError()
  console.error(error)
  const notFound = isRouteErrorResponse(error) && error.status === 404
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <title>Fehler – Spielzug</title>
      <p className="text-5xl" aria-hidden>
        🙈
      </p>
      <h1 className="mt-4 text-2xl font-bold">{notFound ? 'Diese Seite gibt es nicht.' : 'Da ist etwas schiefgegangen.'}</h1>
      <p className="mt-2 text-slate-600">Lade die Seite neu. Hilft das nicht, versuch es später noch einmal.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => location.reload()}>Neu laden</Button>
        <a href="/" className="inline-flex min-h-12 items-center px-3 font-semibold text-brand-700 hover:underline">
          Zum Start
        </a>
      </div>
    </main>
  )
}
