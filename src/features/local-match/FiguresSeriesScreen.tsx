import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'
import type { Shootout } from './interactive/penaltyShootout'
import { FiguresMatchScreen } from './FiguresMatchScreen'
import { PenaltyShootoutScreen } from './PenaltyShootoutScreen'
import { SeriesPrep } from './SeriesPrep'
import { seriesMatchInput, seriesPenalties, seriesSetup, seriesStanding, type SeriesSetup } from './matchSeries'
import type { MatchResult, MatchSide } from './matchTypes'
import type { SimulationInput } from './simulator'

/** Stable identities: the match screen recomputes its run whenever the list of human sides changes. */
const ONLY_LOCAL: readonly MatchSide[] = ['local']
const BOTH_SIDES: readonly MatchSide[] = ['local', 'cpu']

interface Props {
  /** First game of the series: already built with the figures engine. */
  readonly input: SimulationInput
  readonly versusCpu: boolean
  readonly names: Readonly<Record<MatchSide, string>>
  readonly onReturn: () => void
  readonly onRematch: () => void
  readonly onNewMatch: () => void
  readonly onSeriesFinished: (winner: MatchSide, wins: Record<MatchSide, number>) => void
}

/**
 * Home-and-away series played on the figures engine, game by game: the next game is only built when the people ask for it, with the
 * formation and strategy they just chose. Against the CPU the tie-break is shot by hand; in hot-seat the traditional resolution applies.
 */
export function FiguresSeriesScreen({ input, versusCpu, names, onReturn, onRematch, onNewMatch, onSeriesFinished }: Props) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(input)
  const [completed, setCompleted] = useState<readonly MatchResult[]>([])
  const [preparing, setPreparing] = useState(false)
  const [shootout, setShootout] = useState<Shootout | null>(null)
  const recorded = useRef(false)
  const humanSides = versusCpu ? ONLY_LOCAL : BOTH_SIDES
  const finished = completed.some((result) => result.seed === current.seed)
  const standing = seriesStanding(completed)
  const first = completed[0]
  const penalties = first && standing.needsPenalties ? versusCpu ? shootout?.winner ? { score: shootout.score, winner: shootout.winner } : null : seriesPenalties(first) : null
  const awaitingShootout = versusCpu && standing.closed && standing.needsPenalties && !shootout?.winner
  const winner: MatchSide = penalties?.winner ?? (standing.wins.local > standing.wins.cpu ? 'local' : 'cpu')
  const [setup, setSetup] = useState<SeriesSetup | null>(null)

  const onMatchFinished = useCallback((result: MatchResult) => {
    setCompleted((previous) => {
      if (previous.some((item) => item.seed === result.seed)) return previous
      const all = [...previous, result]
      const closing = seriesStanding(all)
      if (closing.closed && !recorded.current && !(versusCpu && closing.needsPenalties)) {
        recorded.current = true
        const kicks = closing.needsPenalties ? seriesPenalties(all[0]) : null
        window.setTimeout(() => onSeriesFinished(kicks?.winner ?? (closing.wins.local > closing.wins.cpu ? 'local' : 'cpu'), closing.wins), 0)
      }
      return all
    })
  }, [onSeriesFinished, versusCpu])
  const shootoutFinished = useCallback((result: Shootout) => {
    setShootout(result)
    if (recorded.current || !result.winner) return
    recorded.current = true
    onSeriesFinished(result.winner, seriesStanding(completed).wins)
  }, [completed, onSeriesFinished])
  const startNext = (next: SeriesSetup) => { setSetup(next); setCurrent(seriesMatchInput(first, completed.length + 1, input.catalog, next)); setPreparing(false) }

  return <div className="match-series fm-series">
    <ConfirmNavigation label={t('navigation.exitMatch')} message={t(standing.closed ? 'navigation.matchExitWarning' : 'navigation.seriesExitWarning')} onConfirm={onReturn} />
    <FiguresMatchScreen key={current.seed} input={current} humanSides={humanSides} names={names} onFinished={onMatchFinished} />
    {finished && <section className="series-card" aria-label={t('playtest.seriesTitle')}>
      <h2>{t('playtest.seriesTitle')}</h2>
      <ol>{completed.map((match, index) => <li key={match.seed}>{t('series.game', { count: index + 1 })} · {match.score.local}–{match.score.cpu}</li>)}</ol>
      <p>{t('series.standing', { local: standing.wins.local, cpu: standing.wins.cpu })}</p>
      {standing.closed && versusCpu && standing.needsPenalties && <PenaltyShootoutScreen seed={first.seed} rosters={{ local: completed.at(-1)!.local.players, cpu: completed.at(-1)!.cpu.players }} catalog={input.catalog} names={names} onFinished={shootoutFinished} />}
      {awaitingShootout ? null : standing.closed
        ? <><h2>{t('series.winner', { name: names[winner] })}</h2>{penalties && <p>{t('series.penalties', { local: penalties.score.local, cpu: penalties.score.cpu })}</p>}<button className="primary-action" onClick={onRematch} title={t('navigation.rematchHint')}>{t('match.rematch')}</button><button className="secondary-action" onClick={onNewMatch}>{t('match.newMatch')}</button></>
        : preparing ? <SeriesPrep setup={setup ?? seriesSetup(first)} catalog={input.catalog} names={names} secondIsHuman={!versusCpu} onCancel={() => setPreparing(false)} onStart={startNext} />
          : <button className="primary-action" onClick={() => setPreparing(true)}>{t('seriesPrep.prepare')}</button>}
    </section>}
  </div>
}
