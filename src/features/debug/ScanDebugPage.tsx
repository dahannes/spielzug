import { useEffect, useState } from 'react'
import { EFFORTS, MODEL_IDS, type Effort, type ModelId } from '../../../shared/api/models'
import { useAnalyzeScan, type ScanAnalysis } from './useAnalyzeScan'
import { BackLink, Button, Card, ErrorText } from '../../components/ui'
import { PhotoCapture } from '../../components/PhotoCapture'
import { errorText } from '../../lib/apiError'
import { paths } from '../../app/paths'
import { controlClass } from '../../components/styles'

interface Run extends ScanAnalysis {
  id: number
  effort: Effort
}

let runId = 0

/**
 * Scan debug view: camera → scan → straight to the LLM, without the dictation logic.
 * Shows what was read, cost, tokens, latency and the raw output. Nothing is stored.
 */
export function ScanDebugPage() {
  const [scan, setScan] = useState<{ blob: Blob; url: string } | null>(null)
  const [model, setModel] = useState<ModelId>('claude-haiku-5-5')
  const [effort, setEffort] = useState<Effort>('low')
  const [runs, setRuns] = useState<Run[]>([])
  const analyze = useAnalyzeScan()

  useEffect(
    () => () => {
      if (scan) URL.revokeObjectURL(scan.url)
    },
    [scan],
  )

  function run(blob: Blob) {
    analyze.mutate({ scan: blob, model, effort }, { onSuccess: (r) => setRuns((rs) => [{ ...r, id: ++runId, effort }, ...rs]) })
  }

  function accept(blob: Blob) {
    setRuns([])
    setScan({ blob, url: URL.createObjectURL(blob) })
    run(blob)
  }

  return (
    <section className="space-y-4">
      <title>Scan-Debug – Spielzug</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to={paths.wordLists}>Lernwörter</BackLink>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select aria-label="Modell" value={model} onChange={(e) => setModel(e.target.value as ModelId)} className={`${controlClass} w-auto`}>
            {MODEL_IDS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select aria-label="Effort" value={effort} onChange={(e) => setEffort(e.target.value as Effort)} className={`${controlClass} w-auto`}>
            {EFFORTS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          {scan && (
            <Button variant="secondary" disabled={analyze.isPending} onClick={() => run(scan.blob)}>
              Nochmal analysieren
            </Button>
          )}
        </div>
      </div>

      <Card>
        <PhotoCapture onPhoto={accept} disabled={analyze.isPending} />
      </Card>

      {scan && (
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <img src={scan.url} alt="Scan" className="w-full rounded-xl bg-white ring-1 ring-slate-200" />
          <div className="space-y-4">
            {analyze.isPending && <p className="rounded-xl bg-white p-4 ring-1 ring-slate-200">🔎 Analysiere mit {model} / {effort} …</p>}
            <ErrorText>{analyze.isError && `${errorText(analyze.error)} (${analyze.error.message})`}</ErrorText>
            {runs.map((r) => (
              <RunCard key={r.id} run={r} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const mark = (ok: boolean | null) => (ok === null ? '–' : ok ? '✓' : '✗')

function RunCard({ run }: { run: Run }) {
  const { output } = run
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs text-slate-500">
        {run.model} / {run.effort} · {(run.latencyMs / 1000).toFixed(1)} s · in {run.inputTokens} / out {run.outputTokens} tok ·{' '}
        {(run.costUsd * 100).toFixed(2)} ct{run.traceId && ` · trace ${run.traceId.slice(0, 8)}`}
      </p>
      <p className="mt-2 text-slate-800">
        <b>{output.subject}</b> · {output.summary}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 pr-2">Nr</th>
              <th className="pr-2">Aufgabe</th>
              <th className="pr-2">Geschrieben</th>
              <th className="pr-2">Richtig</th>
              <th className="pr-2">ok</th>
              <th className="pr-2">Sicher</th>
              <th>Schrift</th>
            </tr>
          </thead>
          <tbody>
            {output.items.map((it, i) => (
              <tr key={i} className={`border-t align-top ${it.confidence < 0.8 ? 'bg-amber-50' : ''}`}>
                <td className="py-1 pr-2 font-semibold">{it.label ?? '·'}</td>
                <td className="pr-2 tabular-nums">{it.task}</td>
                <td className="pr-2 tabular-nums">{it.written_answer ?? '∅'}</td>
                <td className="pr-2 tabular-nums">{it.expected_answer ?? '?'}</td>
                <td className={`pr-2 font-bold ${it.correct === false ? 'text-red-700' : 'text-brand-700'}`}>{mark(it.correct)}</td>
                <td className="pr-2 tabular-nums">{it.confidence.toFixed(2)}</td>
                <td>
                  {it.legibility}
                  {it.note && <span className="block text-xs text-slate-500">{it.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-slate-500">Rohdaten</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-slate-900 p-3 text-slate-100">{JSON.stringify(run, null, 2)}</pre>
      </details>
    </article>
  )
}
