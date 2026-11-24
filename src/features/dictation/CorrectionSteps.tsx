import { useEffect } from 'react'
import { spokenParts } from '../../../shared/dictation/audio'
import { expectedText } from '../../../shared/dictation/words'
import { PhotoCapture } from '../../components/PhotoCapture'
import { Button, Card, ErrorText } from '../../components/ui'
import { errorText } from '../../lib/apiError'
import { playAudio, primeVoices, speak, stopSpeaking } from '../../lib/speech'
import { useCheckRound, useRound, useRoundAudio, useTrackRound, type Round } from './queries'
import { Corrected } from './RoundResult'
import { useRoundStep } from './roundStep'

type Step = { kind: 'intro' } | { kind: 'word'; index: number; phase: 'look' | 'write' | 'compare' } | { kind: 'photo' }

const PHASES = ['look', 'write', 'compare']

const isStep =
  (n: number) =>
  (s: unknown): s is Step => {
    const step = s as Step | null
    if (step?.kind === 'intro' || step?.kind === 'photo') return true
    return step?.kind === 'word' && Number.isInteger(step.index) && step.index >= 0 && step.index < n && PHASES.includes(step.phase)
  }

const METHOD = ['Anschauen: Wo ist die schwierige Stelle?', 'Abdecken.', 'Aus dem Kopf aufschreiben – mit Nummer.', 'Vergleichen. Falsch? Durchstreichen und neu schreiben.']

/**
 * Berichtigung (SR-25): per wrong word look, cover, write from memory, compare – then a photo that
 * is read and graded like a dictation.
 */
export function CorrectionSteps({ round }: { round: Round }) {
  const n = round.words.length
  // restored after a reload (SR-25); a double tap moves one phase, not two
  const { step, set: setStep, advance, settling } = useRoundStep<Step>(round.id, { kind: 'intro' }, isStep(n))
  const check = useCheckRound()
  const track = useTrackRound()
  const audio = useRoundAudio(round).data
  // What was written in the dictation: the letters missed there are underlined.
  const original = useRound(round.corrects_round_id ?? undefined).data

  useEffect(() => {
    void primeVoices()
    return stopSpeaking
  }, [])

  if (step.kind === 'intro') {
    return (
      <Card className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black">Berichtigung</h1>
        <p className="mt-2 text-lg">
          {n === 1 ? '1 Wort' : `${n} Wörter`} aus {round.discipline === 'vocabulary' ? 'deinem Vokabeltest' : 'deinem Diktat'}. Nimm ein neues Blatt. So geht's:
        </p>
        <ol className="mt-4 space-y-3">
          {METHOD.map((text, i) => (
            <li key={text} className="flex items-start gap-3">
              <span className="grid size-9 flex-none place-items-center rounded-full border-2 border-slate-900 font-black" aria-hidden>
                {i + 1}
              </span>
              <span className="pt-1.5 text-lg">{text}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-end">
          <Button
            className="min-h-16 px-8 text-xl font-black"
            onClick={() =>
              advance(() => {
                track.mutate({ roundId: round.id, event: 'kickoff' })
                setStep({ kind: 'word', index: 0, phase: 'look' })
              })
            }
          >
            ▶ Los geht's
          </Button>
        </div>
      </Card>
    )
  }

  if (step.kind === 'word') {
    const w = round.words[step.index]
    const number = step.index + 1
    const written = original?.results?.find((r) => r.wordId === w.id)?.read
    const listen = () => {
      const url = audio?.get(w.id)
      if (url) playAudio(url)
      else speak(spokenParts(w))
    }
    const go = (phase: 'look' | 'write' | 'compare') => advance(() => setStep({ ...step, phase }))
    const next = () =>
      advance(() => {
        stopSpeaking()
        if (number < n) setStep({ kind: 'word', index: number, phase: 'look' })
        else {
          track.mutate({ roundId: round.id, event: 'whistle' })
          setStep({ kind: 'photo' })
        }
      })

    return (
      <section className="mx-auto max-w-2xl space-y-6">
        <p className="text-right text-lg font-extrabold text-slate-500" aria-live="polite">
          Wort {number} von {n}
        </p>
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-3xl border-[3px] border-slate-900 bg-white p-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-slate-900 text-2xl font-black text-white" aria-label={`Nummer ${number}`}>
            {number}
          </span>
          {step.phase === 'write' ? (
            <p className="text-2xl font-bold text-slate-500">✋ Abgedeckt</p>
          ) : (
            <p lang="de" className="max-w-full hyphens-auto wrap-break-word text-4xl font-black text-slate-900 md:text-6xl">
              {written ? <Corrected expected={expectedText(w)} written={written} /> : expectedText(w)}
            </p>
          )}
          {w.translation && <p className="text-xl font-bold text-slate-500">{w.translation}</p>}
        </div>
        <p className="text-center text-xl font-bold" aria-live="polite">
          {step.phase === 'look'
            ? written
              ? 'Schau genau hin: Die unterstrichenen Buchstaben hattest du vergessen.'
              : 'Schau dir das Wort genau an. Wo ist die schwierige Stelle?'
            : step.phase === 'write'
              ? `Schreib die ${number} und das Wort aus dem Kopf.`
              : 'Vergleich Buchstabe für Buchstabe. Falsch? Durchstreichen und neu schreiben.'}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {step.phase === 'look' ? (
            <Button variant="secondary" onClick={listen}>
              🔊 Anhören
            </Button>
          ) : (
            <span />
          )}
          {step.phase === 'look' ? (
            <Button className="min-h-16 px-8 text-xl font-black" aria-disabled={settling || undefined} onClick={() => go('write')}>
              ✋ Abdecken
            </Button>
          ) : step.phase === 'write' ? (
            <Button className="min-h-16 px-8 text-xl font-black" aria-disabled={settling || undefined} onClick={() => go('compare')}>
              👀 Vergleichen
            </Button>
          ) : (
            <Button className="min-h-16 px-8 text-xl font-black" aria-disabled={settling || undefined} onClick={next}>
              {number < n ? 'Weiter →' : 'Fertig – Foto machen'}
            </Button>
          )}
        </div>
      </section>
    )
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Geschafft! ✍️</h1>
      <p className="mt-3 text-lg">Mach ein Foto von deiner Berichtigung.</p>
      <div className="mt-5">
        <PhotoCapture disabled={check.isPending} onPhoto={(photo) => check.mutate({ round, photo })} />
      </div>
      {check.isPending && (
        <p className="mt-4 text-lg" role="status">
          🔎 Ich lese dein Blatt …
        </p>
      )}
      <ErrorText>{check.isError && errorText(check.error)}</ErrorText>
    </Card>
  )
}
