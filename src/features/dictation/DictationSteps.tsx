import { useEffect, useRef, useState } from 'react'
import type { ListWord } from '../../../shared/dictation/words'
import { spokenParts } from '../../../shared/dictation/audio'
import { languageOf } from '../../../shared/subjects'
import { PhotoCapture } from '../../components/PhotoCapture'
import { focusClass } from '../../components/styles'
import { Button, Card, ErrorText } from '../../components/ui'
import { errorText } from '../../lib/apiError'
import { playAudio, primeVoices, speak, stopSpeaking } from '../../lib/speech'
import { checkItems } from '../../../shared/dictation/check'
import { focus } from '../../../shared/dictation/metrics'
import { roundsOf, useCheckRound, useRoundAudio, useTrackRound, useWordList, type Round } from './queries'
import { useRoundStep } from './roundStep'
import { VoicePicker } from './VoicePicker'

type Step = { kind: 'prepare' } | { kind: 'word'; index: number } | { kind: 'photo' }

const isStep =
  (n: number) =>
  (s: unknown): s is Step => {
    const step = s as Step | null
    if (step?.kind === 'prepare' || step?.kind === 'photo') return true
    return step?.kind === 'word' && Number.isInteger(step.index) && step.index >= 0 && step.index < n
  }

const CHECKLIST = ['Liniertes Blatt', 'Stift', 'Radierer oder Tintenkiller', 'Ein ruhiger Platz']

/** Dictation like in class: the word, a sentence, the word again. Recorded voice, else the device voice. */
function speakWord(w: ListWord, url: string | null | undefined) {
  if (url) playAudio(url)
  else speak(spokenParts(w))
}

/** Preparation, one screen per dictated word, then the photo of the sheet (wireframes T2/T3). */
export function DictationSteps({ round }: { round: Round }) {
  const n = round.words.length
  // restored after a reload (SR-22); a double tap moves one word, not two
  const { step, set: setStep, advance, settling, restored } = useRoundStep<Step>(round.id, { kind: 'prepare' }, isStep(n))
  const [checked, setChecked] = useState(false)
  // a tap on the locked photo buttons points to the checklist
  const [nudged, setNudged] = useState(0)
  const [resumed, setResumed] = useState(restored && step.kind === 'word')
  const check = useCheckRound()
  const track = useTrackRound()
  const audio = useRoundAudio(round).data
  const vocab = round.discipline === 'vocabulary'
  const say = (index: number) => speakWord(round.words[index], audio?.get(round.words[index].id))

  useEffect(() => {
    void primeVoices()
    return stopSpeaking
  }, [])

  // Speech starts here, in the tap: iOS plays audio only from a user gesture.
  function goToWord(index: number) {
    setResumed(false)
    if (index < n) {
      setStep({ kind: 'word', index })
      say(index)
    } else {
      setStep({ kind: 'photo' })
      stopSpeaking()
      track.mutate({ roundId: round.id, event: 'whistle' })
    }
  }

  if (step.kind === 'prepare') {
    return (
      <Preparation
        round={round}
        recorded={!!audio && [...audio.values()].every(Boolean)}
        onKickoff={() =>
          advance(() => {
            track.mutate({ roundId: round.id, event: 'kickoff' })
            goToWord(0)
          })
        }
      />
    )
  }

  if (step.kind === 'word') {
    const number = step.index + 1
    return (
      <section className="space-y-6">
        <p className="text-right text-lg font-extrabold text-slate-500" aria-live="polite">
          Wort {number} von {n}
        </p>
        {resumed && (
          <p className="text-center text-lg font-bold" role="status">
            Weiter geht's mit Wort {number}. Tipp auf „Nochmal hören“.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2" aria-hidden>
          {round.words.map((w, i) => (
            <span
              key={w.id}
              className={`rounded-full border-2 ${
                i < step.index ? 'size-4 border-slate-900 bg-slate-900' : i === step.index ? 'size-5 border-player bg-player' : 'size-4 border-slate-400 bg-white'
              }`}
            />
          ))}
        </div>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <p className="grid size-48 place-items-center rounded-3xl border-[3px] border-slate-900 bg-white text-9xl font-black tabular-nums md:size-64 md:text-[10rem]" aria-hidden>
              {number}
            </p>
            <p className="text-xl font-bold">Schreib die {number} und das {vocab ? 'englische ' : ''}Wort.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setResumed(false)
                say(step.index)
              }}
              className={`grid size-36 place-items-center rounded-full bg-player text-white hover:brightness-90 md:size-48 ${focusClass}`}
            >
              <svg className="size-20 md:size-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor" />
                <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
              </svg>
              <span className="sr-only">Nochmal hören</span>
            </button>
            <span className="text-xl font-extrabold" aria-hidden>
              Nochmal hören
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button className="min-h-16 px-8 text-xl font-black" aria-disabled={settling || undefined} onClick={() => advance(() => goToWord(number))}>
            {number < n ? 'Weiter →' : 'Abpfiff – Foto machen'}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Abpfiff! ✍️</h1>
      <p className="mt-3 text-lg">Nachspielzeit: Lies dein Blatt in Ruhe durch und hak jeden Punkt ab. Verbessern ist erlaubt!</p>
      <SheetCheck round={round} onChecked={setChecked} nudged={nudged} />
      <div className="mt-5" onClick={() => !checked && setNudged((n) => n + 1)}>
        {!checked && (
          <p key={nudged} className={`mb-2 font-bold ${nudged ? 'text-player' : 'text-slate-500'}`} role={nudged ? 'alert' : undefined}>
            Erst alles abhaken, dann das Foto.
          </p>
        )}
        <PhotoCapture disabled={!checked || check.isPending} onPhoto={(photo) => check.mutate({ round, photo })} />
      </div>
      {check.isPending && (
        <p className="mt-4 text-lg" role="status">
          🔎 Ich lese dein Blatt …
        </p>
      )}
      <ErrorText>{check.isError && errorText(check.error)}</ErrorText>
      <Button variant="link" className="mt-4 text-sm font-normal text-slate-500" onClick={() => goToWord(n - 1)}>
        ← Letztes Wort nochmal hören
      </Button>
    </Card>
  )
}

/**
 * Nachspielzeit (SR-24): check the sheet point by point – the Schwerpunkt first – before the photo.
 * Each point opens after the one above, so the list is read in order, not ticked through.
 */
function SheetCheck({ round, onChecked, nudged }: { round: Round; onChecked: (all: boolean) => void; nudged: number }) {
  const list = useWordList(round.family_id, round.list_id).data
  const items = checkItems(round.words, focus(list ? roundsOf(list, round.child_id) : []), languageOf(round.discipline))
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set())
  // Derived, not set on tap: the Schwerpunkt item can appear once the list has loaded.
  const all = items.every((i) => ticked.has(i.text))
  useEffect(() => onChecked(all), [all, onChecked])
  const fieldset = useRef<HTMLFieldSetElement>(null)
  useEffect(() => {
    if (nudged) fieldset.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nudged])

  function toggle(text: string) {
    const next = new Set(ticked)
    if (!next.delete(text)) next.add(text)
    setTicked(next)
  }

  return (
    <fieldset ref={fieldset} className="mt-4 space-y-3">
      <legend className="sr-only">Kontrolle</legend>
      {items.map((item, i) => {
        const locked = i > 0 && !ticked.has(items[i - 1].text)
        return (
          <label
            key={item.text}
            className={`flex min-h-14 items-center gap-4 rounded-xl border px-4 py-2 text-lg font-bold has-focus-visible:ring-2 has-focus-visible:ring-player ${
              item.focus ? 'border-2 border-player' : 'border-slate-300'
            } ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <input type="checkbox" checked={ticked.has(item.text)} disabled={locked} onChange={() => toggle(item.text)} className="size-7 flex-none accent-player" />
            <span>
              {item.focus && <span className="block text-sm font-extrabold uppercase tracking-wide text-player">Dein Schwerpunkt</span>}
              {item.text}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

/** T2: tick off the things you need, read how it works, then kick off. */
function Preparation({ round, recorded, onKickoff }: { round: Round; recorded: boolean; onKickoff: () => void }) {
  const [ticked, setTicked] = useState<boolean[]>(() => CHECKLIST.map(() => false))
  const open = ticked.filter((t) => !t).length
  const steps = [
    ...(round.discipline === 'vocabulary'
      ? ['Du hörst das deutsche Wort.', 'Schreib erst die Nummer, dann das englische Wort.']
      : ['Hör gut zu: Wort – Satz – Wort.', `Schreib erst die Nummer, dann das Wort.${round.words.some((w) => w.article) ? ' Nomen mit Artikel.' : ''}`]),
    `${round.words.length} Wörter. In Ruhe ist besser als schnell.`,
    'Alles nochmal durchlesen, dann ein Foto vom Blatt.',
  ]

  return (
    <section className="space-y-5">
      <h1 className="text-3xl font-black">Trainings-Vorbereitung</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <fieldset className="space-y-3 rounded-2xl border-2 border-slate-900 bg-white p-5">
          <legend className="sr-only">Das brauchst du</legend>
          <h2 className="text-xl font-black" aria-hidden>
            1 · Das brauchst du
          </h2>
          <p className="text-slate-500">Hak alles ab, dann kann es losgehen.</p>
          {CHECKLIST.map((label, i) => (
            <label key={label} className="flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border border-slate-300 px-4 text-lg font-bold has-focus-visible:ring-2 has-focus-visible:ring-player">
              <input
                type="checkbox"
                checked={ticked[i]}
                onChange={() => setTicked(ticked.map((t, k) => (k === i ? !t : t)))}
                className="size-7 accent-player"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-300">
          <h2 className="text-xl font-black">2 · So läuft das Training</h2>
          <ol className="space-y-3">
            {steps.map((text, i) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid size-9 flex-none place-items-center rounded-full border-2 border-slate-900 font-black" aria-hidden>
                  {i + 1}
                </span>
                <span className="pt-1.5 text-lg">{text}</span>
              </li>
            ))}
          </ol>
          {/* the recorded voice needs no choice; only the device voice offers one */}
          {!recorded && <VoicePicker />}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <span className="font-bold text-slate-500" role="status">
          {open === 0 ? 'Alles bereit!' : `Noch ${open} abhaken`}
        </span>
        <Button className="min-h-16 px-8 text-xl font-black" disabled={open > 0} onClick={onKickoff}>
          ▶ Anpfiff!
        </Button>
      </div>
    </section>
  )
}
