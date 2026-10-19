import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from '../draft/catalog'
import type { MatchResult, MatchSide } from './matchTypes'
import { MatchScreen } from './MatchScreen'
import { nextSeriesMatch, seriesPenalties, seriesStanding } from './matchSeries'

interface Props {
  readonly result: MatchResult
  readonly catalog?: readonly Player[]
  readonly localName?: string
  readonly cpuName?: string
  readonly onRematch: () => void
  readonly onNewMatch?: () => void
  readonly onReturn: () => void
  readonly onFinished?: () => void
  readonly onSeriesFinished?: (winner: MatchSide, wins: Record<MatchSide, number>) => void
}

export function MatchSeriesScreen({ result, catalog = DRAFT_CATALOG, onSeriesFinished, ...props }: Props) {
  const { t } = useTranslation()
  const [matches, setMatches] = useState<readonly MatchResult[]>([result])
  const [finished, setFinished] = useState(false)
  const recorded = useRef(false)
  const current = matches[matches.length - 1]
  const standing = seriesStanding(matches)
  const penalties = standing.needsPenalties ? seriesPenalties(result) : null
  const winner = penalties?.winner ?? (standing.wins.local > standing.wins.cpu ? 'local' : 'cpu')
  const name = (side: MatchSide) => side === 'local' ? props.localName ?? t('game.myTeam') : props.cpuName ?? t('match.cpuTeam')
  const finish = () => {
    setFinished(true)
    props.onFinished?.()
    if (standing.closed && !recorded.current) { recorded.current = true; onSeriesFinished?.(winner, standing.wins) }
  }
  return <div className="match-series">
    <MatchScreen key={current.seed} {...props} result={current} catalog={catalog} onFinished={finish} onReplayStart={() => setFinished(false)} showNewMatchActions={standing.closed} resultExplanationNote={standing.closed ? t('series.winner', { name: name(winner) }) + (penalties ? ' · ' + t('series.penalties', { local: penalties.score.local, cpu: penalties.score.cpu }) : '') : t('playtest.seriesProgress', { played: matches.length, next: matches.length + 1 })} />
    <section className="series-card" aria-label={t(result.seriesFormat === 'home-away' ? 'playtest.seriesTitle' : 'series.title')} aria-live="polite">
      <h2>{t(result.seriesFormat === 'home-away' ? 'playtest.seriesTitle' : 'series.title')}</h2><p>{t(result.seriesFormat === 'home-away' ? 'playtest.seriesHelp' : 'series.help')}</p>
      <ol className="series-results">{matches.map((match, index) => <li key={match.seed}>{t('series.game', { count: index + 1 })} · {finished || index < matches.length - 1 ? `${match.score.local}–${match.score.cpu}` : t('match.playing')}</li>)}</ol>
      {finished && <>
        <p>{t('series.standing', { local: standing.wins.local, cpu: standing.wins.cpu })}</p>
        {!standing.closed && <p className="stage-indicator">{t('playtest.seriesProgress', { played: matches.length, next: matches.length + 1 })}</p>}
        {standing.closed ? <div className="series-winner"><h3>{t('series.winner', { name: name(winner) })}</h3>{penalties && <p>{t('series.penalties', { local: penalties.score.local, cpu: penalties.score.cpu })}</p>}</div>
          : <button className="primary-action" onClick={() => { setMatches([...matches, nextSeriesMatch(result, matches.length + 1, catalog)]); setFinished(false) }}>{t(matches.length >= (result.seriesFormat === 'home-away' ? 2 : 3) ? 'series.tieBreak' : 'series.next')}</button>}
      </>}
    </section>
  </div>
}
