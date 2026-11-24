import { useParams } from 'react-router'
import { paths } from '../../app/paths'
import { BackLink, ErrorText, Loading } from '../../components/ui'
import { disciplineOf } from '../../../shared/subjects'
import { CorrectionSteps } from './CorrectionSteps'
import { DictationSteps } from './DictationSteps'
import { useRound } from './queries'
import { RoundResult } from './RoundResult'

/** One training: preparation, listen and write on paper, take a photo, see the report (ADR-021); or a Berichtigung (SR-25). */
export function RoundPage() {
  const { roundId } = useParams()
  const round = useRound(roundId)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* back to the list's Spielvorbereitung, where the games are */}
        <BackLink to={round.data ? paths.training(round.data.list_id) : paths.home}>{round.data ? 'Spielvorbereitung' : 'Trainingsplan'}</BackLink>
        {round.data && (
          <p className="text-sm font-bold text-slate-500">
            {round.data.corrects_round_id ? 'Berichtigung' : disciplineOf(round.data.discipline).name} · {round.data.word_lists?.title}
            {round.data.children && <> · {round.data.children.name}</>}
          </p>
        )}
      </div>
      {round.isPending ? (
        <Loading />
      ) : round.isError ? (
        <ErrorText>Die Runde konnte nicht geladen werden. Prüf die Verbindung und lade die Seite neu.</ErrorText>
      ) : !round.data ? (
        <p className="text-slate-600">Diese Runde gibt es nicht.</p>
      ) : round.data.results ? (
        <RoundResult round={round.data} results={round.data.results} />
      ) : round.data.corrects_round_id ? (
        <CorrectionSteps key={round.data.id} round={round.data} />
      ) : (
        <DictationSteps key={round.data.id} round={round.data} />
      )}
    </section>
  )
}
