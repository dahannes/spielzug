import { useState } from 'react'
import { useLocation } from 'react-router'
import { isSecure, wordStats } from '../../../shared/dictation/pick'
import { disciplineOf, fitsGrade, GRADES, gradeLabel } from '../../../shared/subjects'
import { daysUntil } from '../../../shared/dictation/schedule'
import { paths } from '../../app/paths'
import { focusClass } from '../../components/styles'
import { Button, ButtonLink, Card, ConfirmButton, ErrorText, Loading } from '../../components/ui'
import { ChildBar } from '../children/ChildBar'
import { useChildren, useCurrentChild, type Child } from '../children/queries'
import { useFamily } from '../family/useFamily'
import { gradesOf, roundsOf, useResetProgress, useStartRound, useWordLists, type WordList } from './queries'
import { editorState } from './editorBack'

/** Word lists with progress; starts a dictation round (ADR-021). */
export function WordListsPage() {
  const family = useFamily().data
  const lists = useWordLists(family?.id)
  const children = useChildren(family?.id)
  const { current: child, choose } = useCurrentChild(children.data)
  const [grade, setGrade] = useState<number | null>(null)
  // the editor comes back here – also inside the trainer area
  const location = useLocation()
  const back = editorState(location.pathname + location.search)

  return (
    <section className="space-y-4">
      <title>Lernwörter – Spielzug</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lernwörter-Diktat</h1>
        <ButtonLink variant="secondary" to={paths.newWordList} state={back}>
          + Neue Liste
        </ButtonLink>
      </div>
      {family && children.data && <ChildBar kids={children.data} current={child} onChoose={choose} />}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Nach Klasse filtern">
        <span className="mr-1 text-sm text-slate-600">Klasse</span>
        {[null, ...GRADES].map((g) => (
          <button
            key={g ?? 'all'}
            type="button"
            aria-pressed={grade === g}
            aria-label={g === null ? 'Alle Klassen' : `Klasse ${g}`}
            onClick={() => setGrade(g)}
            className={`min-h-9 min-w-9 rounded-xl px-2 text-sm font-bold ${grade === g ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'} ${focusClass}`}
          >
            {g ?? 'Alle'}
          </button>
        ))}
      </div>
      {!family || lists.isPending || children.isPending ? (
        <Loading />
      ) : lists.isError ? (
        <ErrorText>Die Listen konnten nicht geladen werden. Prüf die Verbindung und lade die Seite neu.</ErrorText>
      ) : lists.data.length === 0 ? (
        <Card>
          <p className="text-slate-600">Noch keine Wörterliste. Fotografiere die Liste aus der Schule mit „Neue Liste“.</p>
        </Card>
      ) : (
        lists.data.filter((list) => grade === null || fitsGrade(gradesOf(list), grade)).map((list) => <ListCard key={list.id} list={list} child={child} back={back} />)
      )}
    </section>
  )
}

function testLabel(days: number | null): string | null {
  if (days === null || days < 0) return null
  return days === 0 ? 'Test ist heute!' : days === 1 ? 'Test ist morgen' : `Test in ${days} Tagen`
}

function ListCard({ list, child, back }: { list: WordList; child: Child | undefined; back: ReturnType<typeof editorState> }) {
  const start = useStartRound()
  const reset = useResetProgress()
  const rounds = roundsOf(list, child?.id)
  const stats = wordStats(rounds)
  const secure = list.words.filter((w) => isSecure(stats.get(w.id))).length
  const test = testLabel(daysUntil(list.test_date))

  return (
    <Card>
      <article>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">{list.title}</h2>
          {test && <p className="font-semibold text-player">{test}</p>}
        </div>
        <p className="mt-1 flex flex-wrap gap-1.5 text-xs font-bold">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-indigo-800">
            {disciplineOf(list.discipline).subject} · {disciplineOf(list.discipline).name}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-900">Klasse {gradeLabel(gradesOf(list))}</span>
        </p>
        <p className="mt-3 text-slate-700">
          {child && <>{child.name}: </>}
          <b>{secure}</b> von {list.words.length} Wörtern sicher
        </p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="h-full bg-player" style={{ width: `${list.words.length ? (secure / list.words.length) * 100 : 0}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={!child || start.isPending || list.words.length === 0} onClick={() => child && start.mutate({ list, childId: child.id })}>
            {list.discipline === 'vocabulary' ? '▶ Vokabeln üben' : '▶ Diktat starten'}
          </Button>
          <ButtonLink variant="link" to={paths.wordList(list.id)} state={back}>
            Liste ansehen
          </ButtonLink>
          {child && rounds.length > 0 && (
            <ConfirmButton
              variant="link"
              className="ml-auto text-sm font-normal text-slate-500 hover:text-red-700"
              disabled={reset.isPending}
              question={`Fortschritt von ${child.name} bei „${list.title}“ auf null setzen? ${rounds.length === 1 ? 'Die Runde wird' : `Alle ${rounds.length} Runden werden`} gelöscht. Die Wörter bleiben.`}
              confirmLabel="Zurücksetzen"
              onConfirm={() => reset.mutate({ listId: list.id, childId: child.id })}
            >
              Fortschritt zurücksetzen
            </ConfirmButton>
          )}
        </div>
        <ErrorText>
          {start.isError ? 'Das Diktat konnte nicht gestartet werden.' : reset.isError ? 'Der Fortschritt konnte nicht zurückgesetzt werden.' : null}
        </ErrorText>
      </article>
    </Card>
  )
}
