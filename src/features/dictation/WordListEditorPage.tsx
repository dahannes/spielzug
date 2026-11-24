import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { listWord, parseTypedList, parseTypedVocab, uniqueWords, type ListWord } from '../../../shared/dictation/words'
import { PhotoCapture } from '../../components/PhotoCapture'
import { BackLink, Button, Card, ConfirmButton, ErrorText, Field, Loading, TextInput } from '../../components/ui'
import { errorText } from '../../lib/apiError'
import { useFamily } from '../family/useFamily'
import { disciplineOf, fitsGrade, GRADES, gradeLabel, LIST_DISCIPLINES, tapGrade, type GradeRange, type ListDiscipline } from '../../../shared/subjects'
import { useChildren, useCurrentChild } from '../children/queries'
import { gradesOf, useDeleteWordList, useReadWordList, useSaveWordList, useWordList, type WordList } from './queries'
import { controlClass, focusClass } from '../../components/styles'
import { backOf } from './editorBack'

/** Create or edit a word list: photo of the school list (AI reads it) or typed, then checked by the parents. */
export function WordListEditorPage() {
  const { listId } = useParams()
  const family = useFamily().data
  const existing = useWordList(family?.id, listId)
  const children = useChildren(family?.id)
  const { current } = useCurrentChild(children.data)
  // "+ Neue Vokabelliste" on the Vokabeln card opens the editor for that training type
  const asked = useSearchParams()[0].get('discipline')
  const discipline: ListDiscipline = LIST_DISCIPLINES.find((d) => d === asked) ?? 'word-dictation'
  // back where the editor was opened from (the trainer's Wörterlisten tab, the start page)
  const back = backOf(useLocation().state)

  return (
    <section className="space-y-5">
      <title>Wörterliste – Spielzug</title>
      <BackLink to={back}>Zurück</BackLink>
      {!family || (listId && existing.isPending) || children.isPending ? (
        <Loading />
      ) : listId && !existing.data ? (
        <p className="text-slate-600">Diese Liste gibt es nicht.</p>
      ) : (
        <Editor key={listId ?? 'new'} familyId={family.id} initial={existing.data} grade={current?.grade} discipline={discipline} back={back} />
      )}
    </section>
  )
}

/**
 * A new list is meant for the Klasse of the player on this device; all grades without one. Its
 * training type is chosen while it has no words and never changes afterwards (SR-15).
 */
function Editor({
  familyId,
  initial,
  grade,
  discipline: asked,
  back,
}: {
  familyId: string
  initial?: WordList
  grade?: number
  discipline: ListDiscipline
  back: string
}) {
  const navigate = useNavigate()
  const save = useSaveWordList()
  const remove = useDeleteWordList()
  const [discipline, setDiscipline] = useState<ListDiscipline>(initial?.discipline ?? asked)
  const vocab = discipline === 'vocabulary'
  const [title, setTitle] = useState(initial?.title ?? '')
  const [testDate, setTestDate] = useState(initial?.test_date ?? '')
  const [words, setWords] = useState<ListWord[]>(initial?.words ?? [])
  // typed but not added yet: "Liste speichern" takes these words too
  const [typed, setTyped] = useState('')
  const [grades, setGrades] = useState<GradeRange>(initial ? gradesOf(initial) : grade ? { min: grade, max: grade } : { min: 1, max: 6 })
  const busy = save.isPending || remove.isPending
  // Vokabeln are asked in German: without a meaning there is nothing to say
  const pending = typed.trim() ? (vocab ? parseTypedVocab(typed) : parseTypedList(typed)) : []
  const all = uniqueWords([...words, ...pending])
  const missingMeaning = vocab && all.some((w) => !w.translation)

  function update(id: string, patch: Partial<ListWord>) {
    setWords((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w
        const next = { ...w, ...patch }
        // keeps the id: progress and audio stay with the word when it is corrected
        return listWord(next.article, next.word, next.form, next.sentence, w.id, next.translation)
      }),
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{vocab ? (initial ? 'Vokabelliste' : 'Neue Vokabelliste') : initial ? 'Wörterliste' : 'Neue Wörterliste'}</h1>
      <fieldset disabled={busy} className="space-y-5">
        <ListImport
          discipline={discipline}
          typed={typed}
          onTyped={setTyped}
          onWords={(added, suggestedTitle) => {
            setWords((ws) => uniqueWords([...ws, ...added]))
            if (!title && suggestedTitle) setTitle(suggestedTitle)
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name der Liste">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lernwörter Woche 3" />
          </Field>
          <Field label="Test am (optional)">
            <TextInput type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DisciplinePicker value={discipline} onChange={setDiscipline} locked={!!initial || words.length > 0} />
          <GradePicker value={grades} onChange={setGrades} />
        </div>

        {words.length > 0 && (
          <Card>
            <h2 className="font-semibold">
              {words.length} {vocab ? 'Vokabeln' : 'Wörter'}
            </h2>
            <ul className="mt-3 divide-y divide-slate-200">
              {words.map((w, i) => (
                <WordRow
                  key={w.id}
                  vocab={vocab}
                  number={i + 1}
                  word={w}
                  onChange={(patch) => update(w.id, patch)}
                  onRemove={() => setWords((ws) => ws.filter((x) => x.id !== w.id))}
                />
              ))}
            </ul>
          </Card>
        )}

        {missingMeaning && <p className="text-sm font-bold text-amber-900">Jede Vokabel braucht ihre deutsche Bedeutung.</p>}
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!title.trim() || all.length === 0 || missingMeaning}
            onClick={() =>
              save.mutate(
                { familyId, id: initial?.id, discipline, title: title.trim(), testDate: testDate || null, grades, words: all },
                { onSuccess: () => navigate(back) },
              )
            }
          >
            {save.isPending ? 'Speichere …' : 'Liste speichern'}
          </Button>
          {initial && (
            <ConfirmButton
              question={`„${initial.title}“ und alle Ergebnisse löschen? Das lässt sich nicht rückgängig machen.`}
              confirmLabel="Löschen"
              onConfirm={() => remove.mutate(initial.id, { onSuccess: () => navigate(back) })}
            >
              Löschen
            </ConfirmButton>
          )}
        </div>
      </fieldset>
      <ErrorText>{save.isError ? 'Speichern hat nicht geklappt. Versuch es noch einmal.' : remove.isError ? 'Löschen hat nicht geklappt.' : null}</ErrorText>
    </>
  )
}

/** Fach · Disziplin of the list: a choice for a new, empty list, fixed afterwards. */
function DisciplinePicker({ value, onChange, locked }: { value: ListDiscipline; onChange: (d: ListDiscipline) => void; locked: boolean }) {
  const label = (id: ListDiscipline) => `${disciplineOf(id).subject} · ${disciplineOf(id).name}`
  if (locked) {
    return (
      <div>
        <p className="text-sm font-medium text-slate-700">Fach · Disziplin</p>
        <p className="mt-1 py-2 font-semibold">{label(value)}</p>
      </div>
    )
  }
  return (
    <div role="group" aria-labelledby="discipline-picker-label">
      <p id="discipline-picker-label" className="text-sm font-medium text-slate-700">
        Fach · Disziplin
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {LIST_DISCIPLINES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={`min-h-11 rounded-xl px-3 font-bold ${value === id ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'} ${focusClass}`}
          >
            {label(id)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Klasse: a tap picks one grade; a range only with "Mehrere Klassen" (SR-13, ADR-043). */
function GradePicker({ value, onChange }: { value: GradeRange; onChange: (range: GradeRange) => void }) {
  const [multiple, setMultiple] = useState(value.min !== value.max)
  return (
    <div role="group" aria-labelledby="grade-picker-label">
      <p id="grade-picker-label" className="font-bold">
        Für Klasse {gradeLabel(value)}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {GRADES.map((g) => {
          const on = fitsGrade(value, g)
          return (
            <button
              key={g}
              type="button"
              aria-label={`Klasse ${g}`}
              aria-pressed={on}
              onClick={() => onChange(tapGrade(value, g, multiple))}
              className={`size-11 rounded-xl font-bold ${on ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'} ${focusClass}`}
            >
              {g}
            </button>
          )
        })}
      </div>
      <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-player">
        <input
          type="checkbox"
          checked={multiple}
          onChange={(e) => {
            setMultiple(e.target.checked)
            // back to one Klasse: keep the lowest
            if (!e.target.checked) onChange({ min: value.min, max: value.min })
          }}
          className="size-5 accent-player"
        />
        Mehrere Klassen
      </label>
      <p className="text-sm text-slate-500">Nur Spieler {multiple ? 'dieser Klassen' : 'dieser Klasse'} sehen die Liste.</p>
    </div>
  )
}

/** Words into the list: a photo of the school list (the AI reads it) or typed, one per line. */
function ListImport({
  discipline,
  typed,
  onTyped: setTyped,
  onWords,
}: {
  discipline: ListDiscipline
  typed: string
  onTyped: (text: string) => void
  onWords: (words: ListWord[], title?: string) => void
}) {
  const read = useReadWordList(discipline)
  const vocab = discipline === 'vocabulary'
  return (
    <Card>
      <h2 className="font-semibold">Liste fotografieren</h2>
      <p className="mt-1 text-sm text-slate-600">
        {vocab ? 'Die KI liest die englischen Wörter und ihre Bedeutung ab.' : 'Die KI liest die gedruckten Wörter ab.'} Prüf sie danach kurz.
      </p>
      <div className="mt-3">
        <PhotoCapture label="Liste fotografieren" disabled={read.isPending} onPhoto={(photo) => read.mutate(photo, { onSuccess: (r) => onWords(r.words, r.title) })} />
      </div>
      {read.isPending && (
        <p className="mt-3" role="status">
          🔎 Lese die Liste …
        </p>
      )}
      <ErrorText>{read.isError && errorText(read.error)}</ErrorText>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-600">Oder Wörter eintippen</summary>
        <Field label={vocab ? 'Vokabeln, eine pro Zeile: englisch = deutsch' : 'Wörter, eins pro Zeile'}>
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={6}
            placeholder={vocab ? 'dog = der Hund\nred = rot\nto run = laufen' : 'der Hund\nelf\nlaufen (läuft)'}
            className={controlClass}
          />
        </Field>
        <Button
          variant="secondary"
          className="mt-2"
          disabled={!typed.trim()}
          onClick={() => {
            onWords(vocab ? parseTypedVocab(typed) : parseTypedList(typed))
            setTyped('')
          }}
        >
          Hinzufügen
        </Button>
      </details>
    </Card>
  )
}

function WordRow({
  vocab,
  number,
  word,
  onChange,
  onRemove,
}: {
  vocab: boolean
  number: number
  word: ListWord
  onChange: (patch: Partial<ListWord>) => void
  onRemove: () => void
}) {
  if (vocab) {
    return (
      <li className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 py-2">
        <input aria-label={`Englisch ${number}`} value={word.word} onChange={(e) => onChange({ word: e.target.value })} className={controlClass} />
        <input aria-label={`Deutsch ${number}`} value={word.translation ?? ''} onChange={(e) => onChange({ translation: e.target.value })} className={controlClass} />
        <Button variant="link" aria-label={`${word.word} entfernen`} onClick={onRemove} className="text-slate-400 hover:text-red-700">
          ✕
        </Button>
      </li>
    )
  }
  return (
    <li className="grid grid-cols-[5rem_1fr_auto] items-start gap-2 py-2 sm:grid-cols-[5rem_12rem_1fr_auto]">
      <select
        aria-label={`Artikel ${number}`}
        value={word.article ?? ''}
        onChange={(e) => onChange({ article: (e.target.value || null) as ListWord['article'] })}
        className={controlClass}
      >
        <option value="">–</option>
        <option>der</option>
        <option>die</option>
        <option>das</option>
      </select>
      <input aria-label={`Wort ${number}`} value={word.word} onChange={(e) => onChange({ word: e.target.value })} className={controlClass} />
      <input
        aria-label={`Satz ${number}`}
        value={word.sentence ?? ''}
        onChange={(e) => onChange({ sentence: e.target.value })}
        placeholder="Beispielsatz"
        className={`${controlClass} col-span-3 text-sm text-slate-600 sm:col-span-1`}
      />
      <Button variant="link" aria-label={`${word.word} entfernen`} onClick={onRemove} className="row-start-1 text-slate-400 hover:text-red-700 sm:row-start-auto">
        ✕
      </Button>
    </li>
  )
}
