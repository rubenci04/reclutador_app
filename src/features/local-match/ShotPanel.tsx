import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { DribbleSector } from './interactive/attackTree'
import { TimingBar } from './TimingBar'
import { NEUTRAL_PRECISION, usePrecisionBar, useTapOnce } from './precisionSetting'
import { reducedMotion, useTimingBar, type LaneDriver } from './timing'

export type Lane = DribbleSector
const LANES: readonly Lane[] = ['LEFT', 'CENTER', 'RIGHT']
/** x of each third of the goal on the 300x180 close-up. */
export const GOAL_X: Readonly<Record<Lane, number>> = { LEFT: 85, CENTER: 150, RIGHT: 215 }
export type ShotMode = 'FREE_KICK' | 'PENALTY'
export type ShotOutcome = 'GOAL' | 'SAVE' | 'WIDE' | 'OVER' | 'BLOCK'

/** SIM-FIELD-003: the three thirds of the goal can be touched directly; the buttons below stay as the accessible alternative. */
export function Goal({ mode, lane, onPick }: { readonly mode: ShotMode; readonly lane: Lane | null; readonly onPick?: (lane: Lane) => void }) {
  return <>
    <rect x="0" y="0" width="300" height="180" rx="10" className="dribble-grass" />
    <rect x="40" y="24" width="220" height="80" className="shot-net" />
    {LANES.map((id) => <rect key={id} x={GOAL_X[id] - 35} y="24" width="70" height="80" className={`dribble-lane${lane === id ? ' is-chosen' : ''}${onPick ? ' is-pickable' : ''}`} data-lane={id} onClick={onPick ? () => onPick(id) : undefined} />)}
    <path d="M40 104V24H260V104" className="shot-posts" fill="none" />
    {mode === 'FREE_KICK' && [120, 150, 180].map((x) => <circle key={x} cx={x} cy="126" r="8" className="shot-wall" />)}
    <circle cx="150" cy="152" r="2" className="shot-spot" />
  </>
}

/**
 * Close view of the goal for the hand-taken shot (direct free kick or penalty): pick the third, then stop the marker near the middle.
 * The keeper's reaction was fixed before this screen and is not shown; the precision helps but never decides alone.
 */
export function ShotPanel({ mode, kicker, keeper, onShoot, onTraditional, driver }: { readonly mode: ShotMode; readonly kicker: Player | undefined; readonly keeper: Player | undefined; readonly onShoot: (lane: Lane, precision: number) => void; readonly onTraditional?: () => void; readonly driver?: LaneDriver }) {
  const { t } = useTranslation()
  const bar = usePrecisionBar(); const once = useTapOnce()
  const [ownLane, setOwnLane] = useState<Lane | null>(null)
  const [keyLane, setKeyLane] = useState<Lane | null>(null)
  const lane = driver ? driver.pick : ownLane
  const setLane = driver ? driver.setPick : setOwnLane
  const timer = useTimingBar(bar && !driver && lane !== null)
  const { marker } = timer; const stop = driver ? driver.stop : timer.stop; const motionOff = driver ? driver.motionOff : timer.motionOff
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  /** Bar on: select the third. Bar off: touching a third (or its button) takes the shot at once with the neutral precision. */
  const pickLane = (id: Lane) => {
    if (bar || driver) return setLane(id)
    setOwnLane(id); once(() => onShoot(id, NEUTRAL_PRECISION))
  }
  const shoot = () => { if (lane) onShoot(lane, stop()) }
  const keys = (event: KeyboardEvent) => {
    const move = (id: Lane) => { if (bar) setLane(id); else setKeyLane(id); event.preventDefault() }
    if (event.key === 'ArrowLeft') move('LEFT')
    else if (event.key === 'ArrowRight') move('RIGHT')
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') move('CENTER')
    else if ((event.key === ' ' || event.key === 'Enter') && event.target === event.currentTarget) {
      if (bar && lane) { shoot(); event.preventDefault() } else if (!bar && keyLane) { pickLane(keyLane); event.preventDefault() }
    }
  }
  const shown = lane ?? (bar ? null : keyLane)
  const controls = <>
    <div className="dribble-field">
      <svg className="dribble-pitch" viewBox="0 0 300 180" aria-hidden="true">
        <Goal mode={mode} lane={shown} onPick={pickLane} />
        <g className="shot-keeper" style={{ transform: 'translate(150px, 84px)' }}><circle r="11" /><text textAnchor="middle" y="4">{keeper?.overall_rating ?? ''}</text></g>
        <circle className="dribble-ball" r="5" cx="150" cy="152" />
      </svg>
    </div>
    <div className="dribble-lanes" role="radiogroup" aria-label={t('shot.lanes')}>
      {LANES.map((id) => <button key={id} type="button" role="radio" aria-checked={shown === id} className={`play-card dribble-lane-button${shown === id ? ' is-chosen' : ''}`} onClick={() => pickLane(id)}>
        <b className="play-letter" aria-hidden="true">{id === 'LEFT' ? '←' : id === 'RIGHT' ? '→' : '↑'}</b><strong>{t(`shot.lane.${id}`)}</strong>
      </button>)}
    </div>
    {bar && lane && !motionOff && !driver && <TimingBar marker={marker} label={t('shot.barLabel')} />}
    <div className="dribble-actions">
      {bar && <button type="button" className="primary-action" disabled={!lane} onClick={shoot}>{lane ? t(motionOff ? 'shot.confirm' : 'shot.stop') : t('shot.chooseFirst')}</button>}
      {onTraditional && <button type="button" className="secondary-action" onClick={onTraditional}>{t('shot.traditional')}</button>}
    </div>
    <details className="moment-detail"><summary>{t('moments.detail')}</summary><p>{t(mode === 'PENALTY' ? 'shot.detailPenalty' : 'shot.detailFreeKick')}</p></details>
    <p className="market-hint">{t(bar ? 'shot.hint' : 'field.tapTarget')}</p>
  </>
  return <section className={`live-play dribble-panel shot-panel${driver ? ' is-board-driven is-board-secondary' : ''}`} aria-label={t('shot.label')} tabIndex={-1} onKeyDown={keys} data-mode={mode}>
    <h2 tabIndex={-1} ref={heading}>{t(mode === 'PENALTY' ? 'shot.titlePenalty' : 'shot.titleFreeKick')}</h2>
    <p className="live-moment">{t('shot.intro', { kicker: kicker?.name ?? '', keeper: keeper?.name ?? '' })}</p>
    {driver ? <details className="board-alt"><summary>{t('field.chooseWithButtons')}</summary>{controls}</details> : controls}
  </section>
}

export interface ShotSceneData {
  readonly key: string
  readonly mode: ShotMode
  readonly direction: Lane
  /** The keeper's reaction, fixed before the shot was confirmed. */
  readonly dive: Lane
  readonly outcome: ShotOutcome
  readonly kickerId: string | null
  readonly keeperId: string | null
}

const BALL_END = (scene: ShotSceneData) => {
  const x = GOAL_X[scene.direction]
  switch (scene.outcome) {
    case 'GOAL': return { x, y: 70 }
    case 'SAVE': return { x, y: 78 }
    case 'WIDE': return { x: scene.direction === 'LEFT' ? 24 : scene.direction === 'RIGHT' ? 276 : 268, y: 64 }
    case 'OVER': return { x, y: 8 }
    case 'BLOCK': return { x: 150, y: 124 }
  }
}

/** Run-up, contact, flight, the keeper's reaction and the outcome the engine confirmed. Reduced motion shows the last frame. */
export function ShotScene({ scene, catalog, onDone }: { readonly scene: ShotSceneData; readonly catalog: readonly Player[]; readonly onDone: () => void }) {
  const { t } = useTranslation()
  const reduced = reducedMotion()
  const [phase, setPhase] = useState(reduced ? 4 : 0)
  useEffect(() => {
    const timers = reduced ? [window.setTimeout(onDone, 1800)] : [
      window.setTimeout(() => setPhase(1), 30), window.setTimeout(() => setPhase(2), 520), window.setTimeout(() => setPhase(3), 700),
      window.setTimeout(() => setPhase(4), 1500), window.setTimeout(onDone, 2700),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [scene.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const kicker = catalog.find((p) => p.id === scene.kickerId); const keeper = catalog.find((p) => p.id === scene.keeperId)
  const reflex = scene.outcome === 'SAVE' && scene.dive !== scene.direction
  const keeperX = GOAL_X[scene.outcome === 'SAVE' ? scene.direction : scene.dive]
  const lean = phase >= 3 ? keeperX < 150 ? -32 : keeperX > 150 ? 32 : 0 : 0
  const ball = BALL_END(scene)
  const ballAt = phase >= 3 ? ball : { x: 150, y: 152 }
  return <section className={`dribble-scene shot-scene is-${scene.outcome === 'GOAL' ? 'ok' : 'lost'}`} role="status" aria-live="polite" data-outcome={scene.outcome} data-direction={scene.direction} data-dive={scene.dive} data-phase={phase}>
    <svg className="dribble-pitch" viewBox="0 0 300 180" aria-hidden="true">
      <Goal mode={scene.mode} lane={phase >= 3 ? scene.direction : null} />
      <g className="shot-keeper" style={{ transform: `translate(${phase >= 3 ? keeperX : 150}px, ${phase >= 3 ? 80 : 84}px) rotate(${lean}deg)` }}><circle r="11" /><text textAnchor="middle" y="4">{keeper?.overall_rating ?? ''}</text></g>
      <g className="dribble-attacker shot-kicker" style={{ transform: `translate(${phase >= 1 ? 142 : 100}px, ${phase >= 1 ? 160 : 176}px)` }}><circle r="10" /><text textAnchor="middle" y="4">{kicker?.overall_rating ?? ''}</text></g>
      {phase === 2 && <circle className="shot-contact" cx="150" cy="152" r="14" />}
      <circle className="dribble-ball shot-ball" r="5" style={{ transform: `translate(${ballAt.x}px, ${ballAt.y}px)` }} />
    </svg>
    {phase >= 4 && <p><strong>{t(`shot.outcome.${scene.outcome}`, { lane: t(`shot.lane.${scene.direction}`), kicker: kicker?.name ?? '', keeper: keeper?.name ?? '' })}</strong> <small>{t(reflex ? 'shot.reflex' : 'shot.keeperDove', { lane: t(`shot.lane.${scene.dive}`) })}</small></p>}
  </section>
}
