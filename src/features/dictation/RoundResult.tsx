import { useState } from 'react'
import { Link } from 'react-router'
import { isUnsure, letterDiff, type ErrorKind } from '../../../shared/dictation/compare'
import { correctionState } from '../../../shared/dictation/corrections'
import { expectedText } from '../../../shared/dictation/words'
import { paths } from '../../app/paths'
import { goals, newGoals } from '../../../shared/dictation/metrics'
import { focusClass } from '../../components/styles'
import { Button, ButtonLink, Card } from '../../components/ui'
import { isGateMarked } from '../trainer/gate'
import { useFamily } from '../family/useFamily'
import { correctionsOf, roundsOf, useStartCorrection, useStartRound, useWordList, type Round, type WordList, type WordResult } from './queries'
import { ScanPanel } from './ScanPanel'

/** Short marks in the margin, like a teacher's red pen. */
const MARK: Record<ErrorKind, string> = {
  missing: 'fehlt',
  illegible: 'unleserlich!',
  article: 'der/die/das?',
  case: 'groß/klein!',
  ie: 'ie!',
  's-sound': 's/ss/ß?',
  umlaut: 'ä/ö/ü?',
  double: 'doppelt!',
  h: 'h!',
  letters: '',
}

/** The match report (wireframe T4): the corrected sheet, new Tore, the Berichtigung. */
export function RoundResult({ round, results }: { round: Round; results: WordResult[] }) {
  const family = useFamily().data
  const list = useWordList(family?.id, round.list_id).data
  const start = useStartRound()
  // By word id, not by position: the list may have been edited since the round was checked.
  const byWord = new Map(results.map((r) => [r.wordId, r]))
  const right = results.filter((r) => r.verdict === 'right').length
  const wrong = round.words.filter((w) => byWord.get(w.id)?.verdict === 'wrong')
  const isCorrection = !!round.corrects_round_id
  // The dictation this report belongs to: the round itself, or the one a Berichtigung corrects.
  const dictation = list?.rounds.find((r) => r.id === (round.corrects_round_id ?? round.id))

  const rounds = list ? roundsOf(list, round.child_id) : []
  const at = rounds.findIndex((r) => r.id === round.id)
  const scored = new Set(at >= 0 ? newGoals(rounds.slice(0, at), rounds[at]) : [])
  const scoredWords = round.words.filter((w) => scored.has(w.id))
  const secure = list ? goals(list.words.map((w) => w.id), rounds) : null
  const date = round.checked_at ? new Date(round.checked_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) : null
  const when = round.checked_at
    ? new Date(round.checked_at).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null
  // Training time only for trainers (gate passed in this tab), never as a score (SR-61).
  const duration = family && isGateMarked(family.id) ? trainingTime(round.started_at, round.finished_at) : null
  // Phone: sheet or photo; from tablet width both side by side.
  const [view, setView] = useState<'sheet' | 'photo'>('sheet')

  return (
    <div className="grid items-start gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <p className="text-sm text-slate-500">
          {when}
          {duration && <span className="ml-3 rounded-full border border-dashed border-slate-400 px-2.5 py-0.5">Dauer {duration} · nur Trainer</span>}
        </p>
        {round.scan_path && <ViewSwitch view={view} onChange={setView} />}
      </div>

      <section className={`rounded-md bg-white shadow-md ring-1 ring-slate-300 ${view === 'photo' ? 'hidden lg:block' : ''}`} aria-label="Korrektur">
        <div className="flex items-center justify-between gap-4 border-b-2 border-slate-300 px-6 py-4">
          <h1 className="text-2xl font-black text-slate-900">{[isCorrection ? 'Berichtigung' : round.discipline === 'vocabulary' ? 'Vokabeln' : 'Diktat', round.children?.name, date].filter(Boolean).join(' · ')}</h1>
          <p className="flex size-20 shrink-0 -rotate-6 items-center justify-center rounded-full border-[3px] border-red-600 text-2xl font-bold leading-none text-red-600">
            <span aria-hidden>
              {right}/{results.length}
            </span>
            <span className="sr-only">
              {right} von {results.length} richtig
            </span>
          </p>
        </div>
        <ol>
          {round.words.map((w, i) => (
            <ResultLine key={w.id} number={i + 1} expected={expectedText(w)} result={byWord.get(w.id)} />
          ))}
        </ol>
      </section>

      <aside className="space-y-4">
        <ScanPanel scanPath={round.scan_path} className={view === 'sheet' ? 'hidden lg:block' : ''} />
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-300">
            <dt className="text-xs font-bold uppercase text-slate-500">Richtig</dt>
            <dd className="text-2xl font-black">
              {right}/{results.length}
            </dd>
          </div>
          {!isCorrection && (
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-300">
              <dt className="text-xs font-bold uppercase text-slate-500">Neue Tore</dt>
              <dd className="text-2xl font-black text-player">+{scored.size}</dd>
            </div>
          )}
        </dl>

        {scoredWords.length > 0 && (
          <div className="space-y-2 rounded-2xl border-2 border-player bg-white p-4">
            <p className="text-2xl font-black">{scoredWords.length === 1 ? '1 neues Tor!' : `${scoredWords.length} neue Tore!`}</p>
            {secure !== null && list && (
              <p className="font-bold text-slate-500">
                Jetzt {secure} von {list.words.length} Wörtern sicher
              </p>
            )}
            <ul className="flex flex-wrap gap-1.5">
              {scoredWords.map((w) => (
                <li key={w.id} className="rounded-lg bg-player px-2.5 py-1 font-bold text-white">
                  {expectedText(w)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {list && dictation && (isCorrection || wrong.length > 0) && <CorrectionCard list={list} dictation={dictation} words={isCorrection ? null : wrong.map(expectedText)} />}

        <div className="flex flex-wrap gap-3">
          {isCorrection && (
            <ButtonLink variant="secondary" to={paths.round(round.corrects_round_id!)}>
              ← Spielbericht
            </ButtonLink>
          )}
          {list && !isCorrection && (
            <Button className="flex-1" disabled={start.isPending} onClick={() => start.mutate({ list, childId: round.child_id })}>
              ▶ Nächstes Training
            </Button>
          )}
          <ButtonLink variant="secondary" to={paths.training(round.list_id)}>
            Spielvorbereitung
          </ButtonLink>
        </div>
      </aside>
    </div>
  )
}

/**
 * The Berichtigung of a dictation (SR-25): start it, go on with the words still wrong, or see it
 * done. In a dictation's report it lists the wrong words; in a Berichtigung's report only the state.
 */
function CorrectionCard({ list, dictation, words }: { list: WordList; dictation: WordList['rounds'][number]; words: string[] | null }) {
  const start = useStartCorrection()
  const corrections = correctionsOf(list, dictation.id)
  const { open, done } = correctionState(dictation, corrections)
  const latest = corrections.filter((c) => c.results).at(-1)

  return (
    <Card className={`p-4 ${done ? 'border-2 border-player' : ''}`}>
      <h2 className="text-xl font-black">{done ? 'Berichtigung geschafft! 💪' : 'Berichtigung'}</h2>
      {words && (
        <ul className="mt-3 space-y-1 text-2xl font-extrabold text-slate-900">
          {words.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {done ? (
        <p className="mt-2 text-slate-600">Alle Wörter richtig aus dem Kopf geschrieben.</p>
      ) : (
        <>
          <p className="mt-2 text-slate-600">
            {latest ? `Noch ${open.length === 1 ? '1 Wort' : `${open.length} Wörter`}. ` : ''}Anschauen, abdecken, aus dem Kopf schreiben, vergleichen.
          </p>
          <Button className="mt-3 w-full" disabled={start.isPending} onClick={() => start.mutate({ list, round: dictation })}>
            ✏️ {latest ? 'Nochmal berichtigen' : 'Berichtigung starten'}
          </Button>
        </>
      )}
      {words && latest && (
        <Link to={paths.round(latest.id)} className={`mt-3 inline-block font-bold text-slate-600 underline ${focusClass}`}>
          Letzte Berichtigung ansehen
        </Link>
      )}
      <p className="mt-3 text-sm text-slate-500">Im nächsten Training kommen diese Wörter wieder dran.</p>
    </Card>
  )
}

function ViewSwitch({ view, onChange }: { view: 'sheet' | 'photo'; onChange: (view: 'sheet' | 'photo') => void }) {
  const tabs = [
    ['sheet', 'Korrektur'],
    ['photo', 'Foto'],
  ] as const
  return (
    <div role="tablist" aria-label="Ansicht" className="flex rounded-full bg-slate-200 p-1 lg:hidden">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={view === id}
          onClick={() => onChange(id)}
          className={`min-h-10 rounded-full px-4 font-bold ${focusClass} ${view === id ? 'bg-white shadow-sm' : 'text-slate-600'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** mm:ss between kickoff and final whistle; null if either is missing. */
function trainingTime(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const seconds = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function ResultLine({ number, expected, result }: { number: number; expected: string; result: WordResult | undefined }) {
  const illegible = result?.errors.includes('illegible')
  const marks = result?.errors.map((e) => MARK[e]).filter(Boolean) ?? []
  return (
    <li className="grid min-h-16 grid-cols-[3.5rem_minmax(0,1fr)] items-center border-b border-slate-200 last:border-b-0">
      {/* margin line of a school notebook, in grey: red belongs to the correction */}
      <span className="flex items-center justify-end self-stretch border-r-2 border-slate-400 pr-3 text-lg tabular-nums text-slate-500">{number}</span>
      <div lang="de" className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3 pl-5 pr-4 hyphens-auto wrap-break-word">
        {/* what the child wrote, in black */}
        <span className="text-2xl text-slate-900">
          <span className="sr-only">geschrieben: </span>
          {!result?.read ? (
            <span className="text-slate-400">—</span>
          ) : result.verdict === 'wrong' && illegible ? (
            // unreadable: red wavy line, no letter-by-letter verdict
            <span className="underline decoration-red-600 decoration-wavy decoration-2 underline-offset-8">{result.read}</span>
          ) : result.verdict === 'wrong' ? (
            <Written expected={expected} written={result.read} />
          ) : (
            result.read
          )}
        </span>
        {/* red pen */}
        {result?.verdict === 'right' && (
          <span className="text-3xl font-bold leading-none text-red-600">
            <span aria-hidden>✓</span>
            <span className="sr-only">richtig</span>
          </span>
        )}
        {result && isUnsure(result) && (
          <span className="self-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">unsicher gelesen</span>
        )}
        {result?.verdict === 'wrong' && (
          <span className="text-2xl font-semibold text-red-600">
            <span className="sr-only">richtig wäre: </span>
            {illegible ? expected : <Corrected expected={expected} written={result.read ?? ''} />}
            {marks.length > 0 && <span className="ml-3 text-base font-normal italic">{marks.join(' ')}</span>}
          </span>
        )}
      </div>
    </li>
  )
}

/**
 * The child's word: wrong letters crossed out in red, a red caret only where letters are
 * missing (a swapped letter is crossed out, not also marked with a caret).
 */
function Written({ expected, written }: { expected: string; written: string }) {
  const parts = letterDiff(expected, written)
  const swapped = (i: number) => parts[i - 1]?.kind === 'extra' || parts[i + 1]?.kind === 'extra'
  return (
    <span>
      {parts.map((p, i) =>
        p.kind === 'missing' && swapped(i) ? null : p.kind === 'same' ? (
          <span key={i}>{p.text}</span>
        ) : p.kind === 'extra' ? (
          <span key={i} className="line-through decoration-red-600 decoration-[3px]">
            {p.text}
          </span>
        ) : (
          <span key={i} className="relative inline-block w-2 align-baseline" aria-hidden>
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xl font-bold text-red-600">‸</span>
          </span>
        ),
      )}
    </span>
  )
}

/** The correct word in red, with the letters the child missed underlined. */
export function Corrected({ expected, written }: { expected: string; written: string }) {
  return (
    <span>
      {letterDiff(expected, written)
        .filter((p) => p.kind !== 'extra')
        .map((p, i) =>
          p.kind === 'missing' ? (
            <span key={i} className="underline decoration-red-600 decoration-[3px] underline-offset-4">
              {p.text}
            </span>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
    </span>
  )
}
