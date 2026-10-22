import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { MatchSide } from './matchTypes'
import { LANES, finishAutomatically, startShootout, takeKick, type KickRecord, type Lane, type Shootout } from './interactive/penaltyShootout'
import { ShotPanel, ShotScene, type ShotSceneData } from './ShotPanel'
import { reducedMotion } from './timing'

interface Props {
  readonly seed: string
  readonly rosters: Readonly<Record<MatchSide, readonly Player[]>>
  readonly catalog: readonly Player[]
  readonly names: Readonly<Record<MatchSide, string>>
  /** Called once, with the finished shootout whose winner derives only from confirmed kicks. */
  readonly onFinished: (shootout: Shootout) => void
}

const sceneOf = (kick: KickRecord, key: string): ShotSceneData => ({ key, mode: 'PENALTY', direction: kick.direction, dive: kick.dive, outcome: kick.outcome === 'GOAL' ? 'GOAL' : kick.outcome === 'SAVED' ? 'SAVE' : 'WIDE', kickerId: kick.kickerId, keeperId: kick.keeperId })

/**
 * The series tie-break, kick by kick. When the local side shoots, the CPU keeper's dive is already fixed; when the CPU shoots, its side is
 * fixed and the player chooses where the keeper dives. Nothing about the result exists before the kicks are confirmed.
 */
export function PenaltyShootoutScreen({ seed, rosters, catalog, names, onFinished }: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<Shootout>(() => startShootout(seed, rosters, catalog))
  const [scene, setScene] = useState<ShotSceneData | null>(null)
  const [dive, setDive] = useState<Lane | null>(null)
  const reported = useRef(false)
  const pending = state.pending
  const kicker = catalog.find((p) => p.id === pending?.kickerId); const keeper = catalog.find((p) => p.id === pending?.keeperId)
  const rounds = useMemo(() => {
    const total = Math.max(5, Math.ceil(state.kicks.length / 2))
    return Array.from({ length: total }, (_, index) => ({ local: state.kicks[2 * index], cpu: state.kicks[2 * index + 1] }))
  }, [state.kicks])
  const confirm = (input: Parameters<typeof takeKick>[1]) => {
    const result = takeKick(state, input, catalog)
    if (!result) return
    setState(result.state); setDive(null)
    setScene(sceneOf(result.kick, `${result.kick.round}:${result.kick.side}`))
  }
  const rest = () => {
    setState(finishAutomatically(state, catalog)); setScene(null)
  }
  const showingScene = scene !== null
  useEffect(() => { if (state.winner && !showingScene && !reported.current) { reported.current = true; onFinished(state) } }, [state, showingScene, onFinished])
  const mark = (kick: KickRecord | undefined) => kick ? t(`penalty.mark.${kick.outcome}`) : '·'
  return <section className="penalty-shootout" aria-label={t('penalty.label')}>
    <h2>{t('penalty.title')}</h2>
    <p role="status" className="penalty-score">{names.local} {state.score.local} – {state.score.cpu} {names.cpu}</p>
    <ol className="penalty-rounds" aria-label={t('penalty.history')}>{rounds.map((round, index) => <li key={index}><b>{index + 1}</b><span className={`kick-${round.local?.outcome ?? 'NONE'}`} aria-label={`${names.local}: ${mark(round.local)}`}>{mark(round.local)}</span><span className={`kick-${round.cpu?.outcome ?? 'NONE'}`} aria-label={`${names.cpu}: ${mark(round.cpu)}`}>{mark(round.cpu)}</span></li>)}</ol>
    {scene && <ShotScene key={scene.key} scene={scene} catalog={catalog} onDone={() => setScene(null)} />}
    {!scene && pending && pending.side === 'local' && <ShotPanel key={`${pending.round}:local`} mode="PENALTY" kicker={kicker} keeper={keeper} onShoot={(direction, precision) => confirm({ direction, precision })} />}
    {!scene && pending && pending.side === 'cpu' && <section className="live-play dribble-panel penalty-dive" aria-label={t('penalty.diveLabel')}>
      <h2 tabIndex={-1}>{t('penalty.diveTitle')}</h2>
      <p className="live-moment">{t('penalty.diveIntro', { kicker: kicker?.name ?? '', keeper: keeper?.name ?? '' })}</p>
      <div className="dribble-lanes" role="radiogroup" aria-label={t('penalty.diveLanes')}>{LANES.map((id) => <button key={id} type="button" role="radio" aria-checked={dive === id} className={`play-card dribble-lane-button${dive === id ? ' is-chosen' : ''}`} onClick={() => setDive(id)}>
        <b className="play-letter" aria-hidden="true">{id === 'LEFT' ? '←' : id === 'RIGHT' ? '→' : '↑'}</b><strong>{t(`shot.lane.${id}`)}</strong></button>)}</div>
      <div className="dribble-actions"><button type="button" className="primary-action" disabled={!dive} onClick={() => dive && confirm({ dive })}>{dive ? t('penalty.diveConfirm') : t('penalty.diveChoose')}</button></div>
      <p className="market-hint">{reducedMotion() ? t('penalty.diveHintStatic') : t('penalty.diveHint')}</p>
    </section>}
    {state.winner && !scene && <p role="status"><strong>{t('series.winner', { name: names[state.winner] })}</strong> {t('penalty.final', { local: state.score.local, cpu: state.score.cpu })}{state.coinToss && ` ${t('penalty.coin')}`}</p>}
    {!state.winner && !scene && <div className="dribble-actions"><button type="button" className="secondary-action" onClick={rest}>{t('penalty.traditional')}</button></div>}
  </section>
}
