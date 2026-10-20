import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CpuDifficulty } from '../recruiter-duel/cpuPolicy'
import type { RecruiterDuelGame } from '../recruiter-duel/auctionTypes'
import { exportResult, type Session } from './interactive'
import { seriesPenalties, seriesStanding, type SeriesSetup } from './matchSeries'
import type { MatchSide } from './matchTypes'
import { LiveMatchScreen } from './LiveMatchScreen'
import { nextLiveSession } from './interactive/liveModel'
import { SeriesPrep } from './SeriesPrep'

interface Props {
  readonly origin: Session
  readonly acquisition?: RecruiterDuelGame
  readonly versusCpu: boolean
  readonly difficulty: CpuDifficulty
  readonly names: Readonly<Record<MatchSide, string>>
  readonly onReturn: () => void
  readonly onRematch: () => void
  readonly onNewMatch: () => void
  readonly onSeriesFinished: (winner: MatchSide, wins: Record<MatchSide, number>) => void
}

/** Series uses the existing standing/penalty rules; future matches are never calculated in advance. */
export function LiveSeriesScreen({ origin, acquisition, versusCpu, difficulty, names, onReturn, onRematch, onNewMatch, onSeriesFinished }: Props) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(origin)
  const [completed, setCompleted] = useState<readonly Session[]>([])
  const [preparing, setPreparing] = useState(false)
  const [setup, setSetup] = useState<SeriesSetup>(() => ({ lineups: { local: origin.kernel.input.localLineup, cpu: origin.kernel.input.cpuLineup }, benches: origin.kernel.input.benches, formations: origin.kernel.input.formations, tactics: origin.kernel.input.tactics }))
  const [error, setError] = useState('')
  const recorded = useRef(false); const starting = useRef(false)
  const matches = completed.flatMap((session) => { const result = exportResult(session); return result.ok ? [result.value.result] : [] })
  const standing = seriesStanding(matches)
  const penalties = matches.length && standing.needsPenalties ? seriesPenalties(matches[0]) : null
  const winner: MatchSide = penalties?.winner ?? (standing.wins.local > standing.wins.cpu ? 'local' : 'cpu')
  const finished = completed.some((session) => session.sessionId === current.sessionId)
  const onFinished = useCallback((session: Session) => {
    setCompleted((previous) => previous.some((p) => p.sessionId === session.sessionId) ? previous : [...previous, session])
  }, [])
  // Record on the explicit final result commit, never on replay or rerender.
  const finishAndRecord = (session: Session) => {
    onFinished(session)
    const all = [...completed.filter((p) => p.sessionId !== session.sessionId), session]
    const results = all.map((p) => p.result!.result)
    const finalStanding = seriesStanding(results)
    if (finalStanding.closed && !recorded.current) {
      recorded.current = true
      const kicks = finalStanding.needsPenalties ? seriesPenalties(results[0]) : null
      onSeriesFinished(kicks?.winner ?? (finalStanding.wins.local > finalStanding.wins.cpu ? 'local' : 'cpu'), finalStanding.wins)
    }
  }
  return <div className="match-series live-series">
    <LiveMatchScreen key={current.sessionId} origin={current} versusCpu={versusCpu} difficulty={difficulty} names={names} closed={standing.closed} onReturn={onReturn} onFinished={finishAndRecord} />
    <section className="series-card" aria-label={t('playtest.seriesTitle')}>
      <h2>{t('playtest.seriesTitle')}</h2><ol>{matches.map((match, index) => <li key={match.seed}>{t('series.game', { count: index + 1 })} · {match.score.local}–{match.score.cpu}</li>)}</ol>
      {finished && <>
        <p>{t('series.standing', { local: standing.wins.local, cpu: standing.wins.cpu })}</p>
        {standing.closed ? <><h2>{t('series.winner', { name: names[winner] })}</h2>{penalties && <p>{t('series.penalties', { local: penalties.score.local, cpu: penalties.score.cpu })}</p>}<button className="primary-action" onClick={onRematch} title={t('navigation.rematchHint')}>{t('match.rematch')}</button><button className="secondary-action" onClick={onNewMatch}>{t('match.newMatch')}</button></>
          : preparing ? <SeriesPrep setup={setup} catalog={origin.kernel.input.catalog} names={names} secondIsHuman={!versusCpu} onCancel={() => { setPreparing(false); starting.current = false }} onStart={(next) => {
            if (starting.current) return
            starting.current = true
            const created = nextLiveSession(origin, matches.length + 1, next)
            if (created.ok) { setCurrent(created.value); setSetup(next); setPreparing(false); setError('') }
            else setError(created.error)
            starting.current = false
          }} /> : <button className="primary-action" onClick={() => setPreparing(true)}>{t('seriesPrep.prepare')}</button>}
      </>}
      {error && <p role="alert">{t('liveDT.error', { code: error })}</p>}
      {completed.length > 0 && <details><summary>{t('liveDT.seriesAudit')}</summary><label>{t('liveDT.record')}<textarea readOnly value={JSON.stringify({ version: 'local-live-series-v1', acquisition, origin, matches: completed.map((session) => ({ origin: { input: session.kernel.input, options: session.options }, result: session.result, final: session })) })} /></label></details>}
    </section>
  </div>
}
