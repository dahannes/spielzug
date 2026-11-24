import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Abseits!</h1>
      <p className="mt-2 text-slate-600">Diese Seite gibt es nicht.</p>
      <Link to="/" className="mt-6 inline-block text-brand-700 underline">
        Zurück zu den Lernwörtern
      </Link>
    </main>
  )
}
