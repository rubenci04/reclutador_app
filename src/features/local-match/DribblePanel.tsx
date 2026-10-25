import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { LaneDriver } from './timing'
import type { Player } from '../../types/player'
import type { DribbleSector, PendingPlay, PlayChoice } from './interactive/attackTree'

/** SIM-MINI-001: lane x on the 300x180 close-up (the attacker comes from the bottom, the defender waits in the middle). */
export const LANE_X: Readonly<Record<DribbleSector, number>> = { LEFT: 70, CENTER: 150, RIGHT: 230 }
const LANES: readonly DribbleSector[] = ['LEFT', 'CENTER', 'RIGHT']
const choiceOf = (lane: DribbleSector) => `DRIBBLE_${lane}` as PlayChoice
/** Milliseconds for the marker to travel the bar once (one way). Short enough to be a reflex, long enough to be fair. */
const SWEEP_MS = 800
const reduced = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Triangle wave of the elapsed time: 0 at the left end, 1 at the right end. */
export const markerAt = (elapsed: number) => { const phase = (elapsed / SWEEP_MS) % 2; return phase <= 1 ? phase : 2 - phase }
/** Timing precision: 1 in the middle of the bar, 0 at its ends. */
export const precisionAt = (position: number) => Math.round((1 - Math.abs(position - .5) * 2) * 100) / 100

function Pitch({ attacker, defender, lane, cover }: { readonly attacker: Player | undefined; readonly defender: Player | undefined; readonly lane: DribbleSector | null; readonly cover?: DribbleSector }) {
  const x = lane ? LANE_X[lane] : 150
  return <svg className="dribble-pitch" viewBox="0 0 300 180" role="img" aria-hidden="true">
    <rect x="0" y="0" width="300" height="180" rx="10" className="dribble-grass" />
    {LANES.map((id) => <rect key={id} x={LANE_X[id] - 40} y="8" width="80" height="164" rx="6" className={`dribble-lane${lane === id ? ' is-chosen' : ''}${cover === id ? ' is-covered' : ''}`} />)}
    <circle cx={LANE_X.CENTER} cy="30" r="4" className="dribble-goal-mark" />
    <g className="dribble-defender" style={{ transform: `translate(${cover ? LANE_X[cover] : 150}px, 62px)` }}><circle r="12" /><text textAnchor="middle" y="4">{defender?.overall_rating ?? ''}</text></g>
    <g className="dribble-attacker" style={{ transform: `translate(${x}px, 148px)` }}><circle r="12" /><text textAnchor="middle" y="4">{attacker?.overall_rating ?? ''}</text></g>
    <circle className="dribble-ball" r="5" style={{ transform: `translate(${x}px, 132px)` }} />
  </svg>
}

/**
 * First hand-played dribble. Step 1: choose the lane (tap, swipe or arrow keys). Step 2: stop the moving bar near the middle for a better
 * precision. The defender's lane was fixed by the CPU before this screen and stays hidden. Precision helps but never decides alone.
 */
export function DribblePanel({ play, catalog, onChoose, driver }: { readonly play: PendingPlay; readonly catalog: readonly Player[]; readonly onChoose: (choice: PlayChoice, precision?: number) => void; readonly driver?: LaneDriver }) {
  const { t } = useTranslation()
  const attacker = catalog.find((p) => p.id === play.receiverId); const defender = catalog.find((p) => p.id === play.options[0]?.rivalId)
  const motionOff = driver ? driver.motionOff : reduced()
  const [ownLane, setOwnLane] = useState<DribbleSector | null>(null)
  const lane = driver ? driver.pick : ownLane
  const setLane = driver ? driver.setPick : setOwnLane
  const [marker, setMarker] = useState(.5)
  const startedAt = useRef(0); const frame = useRef(0); const swipe = useRef<number | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    if (driver || !lane || motionOff) return
    startedAt.current = performance.now()
    const tick = () => { setMarker(markerAt(performance.now() - startedAt.current)); frame.current = requestAnimationFrame(tick) }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [lane, motionOff, driver])
  const stop = () => { if (!lane) return; const precision = driver ? driver.stop() : motionOff ? .5 : precisionAt(markerAt(performance.now() - startedAt.current)); cancelAnimationFrame(frame.current); onChoose(choiceOf(lane), precision) }
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') { setLane('LEFT'); event.preventDefault() }
    else if (event.key === 'ArrowRight') { setLane('RIGHT'); event.preventDefault() }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { setLane('CENTER'); event.preventDefault() }
    else if ((event.key === ' ' || event.key === 'Enter') && lane && event.target === event.currentTarget) { stop(); event.preventDefault() }
  }
  const pointerUp = (event: PointerEvent) => {
    if (swipe.current === null) return
    const dx = event.clientX - swipe.current; swipe.current = null
    if (Math.abs(dx) > 30) setLane(dx < 0 ? 'LEFT' : 'RIGHT')
  }
  const sweet = marker
  return <section className={`live-play dribble-panel${driver ? ' is-board-driven is-board-secondary' : ''}`} aria-label={t('dribble.label')} tabIndex={-1} onKeyDown={keys}>
    <h2 tabIndex={-1} ref={heading}>{t('dribble.title')}</h2>
    <p className="live-moment">{t('dribble.intro', { attacker: attacker?.name ?? '', defender: defender?.name ?? '' })}</p>
    <div className="dribble-field" onPointerDown={(event) => { swipe.current = event.clientX }} onPointerUp={pointerUp} onPointerCancel={() => { swipe.current = null }}>
      <Pitch attacker={attacker} defender={defender} lane={lane} />
    </div>
    <div className="dribble-lanes" role="radiogroup" aria-label={t('dribble.lanes')}>
      {LANES.map((id) => <button key={id} type="button" role="radio" aria-checked={lane === id} className={`play-card dribble-lane-button${lane === id ? ' is-chosen' : ''}`} onClick={() => setLane(id)}>
        <b className="play-letter" aria-hidden="true">{id === 'LEFT' ? '←' : id === 'RIGHT' ? '→' : '↑'}</b><strong>{t(`dribble.lane.${id}`)}</strong>
      </button>)}
    </div>
    {lane && !motionOff && !driver && <div className="dribble-timing"><div className="dribble-bar" role="img" aria-label={t('dribble.barLabel')}><i className="dribble-sweet" /><i className="dribble-marker" style={{ left: `${sweet * 100}%` }} /></div></div>}
    <div className="dribble-actions">
      <button type="button" className="primary-action" disabled={!lane} onClick={stop}>{lane ? t(motionOff ? 'dribble.confirm' : 'dribble.stop') : t('dribble.chooseFirst')}</button>
      <button type="button" className="secondary-action" onClick={() => onChoose('DRIBBLE_CENTER')}>{t('dribble.traditional')}</button>
    </div>
    <details className="moment-detail"><summary>{t('moments.detail')}</summary><p>{t('dribble.detail')}</p></details>
    <p className="market-hint">{t(driver ? 'field.tapTarget' : 'dribble.hint')}</p>
  </section>
}

export interface DribbleScene { readonly key: string; readonly lane: DribbleSector; readonly cover: DribbleSector; readonly ok: boolean; readonly attackerId: string | null; readonly defenderId: string | null }

/** Shows the confirmed dribble on the close-up: the player and the ball go where the lane said, the defender where he covered. Reduced motion shows the final frame. */
export function DribbleScene({ scene, catalog, onDone }: { readonly scene: DribbleScene; readonly catalog: readonly Player[]; readonly onDone: () => void }) {
  const { t } = useTranslation()
  const [moved, setMoved] = useState(reduced())
  useEffect(() => {
    const go = window.setTimeout(() => setMoved(true), 30)
    const done = window.setTimeout(onDone, reduced() ? 1600 : 1900)
    return () => { window.clearTimeout(go); window.clearTimeout(done) }
  }, [scene.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const attacker = catalog.find((p) => p.id === scene.attackerId); const defender = catalog.find((p) => p.id === scene.defenderId)
  const x = LANE_X[scene.lane]
  return <section className={`dribble-scene ${scene.ok ? 'is-ok' : 'is-lost'}${moved ? ' is-moved' : ''}`} role="status" aria-live="polite" data-lane={scene.lane} data-cover={scene.cover} data-ok={scene.ok}>
    <svg className="dribble-pitch" viewBox="0 0 300 180" aria-hidden="true">
      <rect x="0" y="0" width="300" height="180" rx="10" className="dribble-grass" />
      {LANES.map((id) => <rect key={id} x={LANE_X[id] - 40} y="8" width="80" height="164" rx="6" className={`dribble-lane${scene.lane === id ? ' is-chosen' : ''}${scene.cover === id ? ' is-covered' : ''}`} />)}
      <g className="dribble-defender" style={{ transform: `translate(${moved ? LANE_X[scene.cover] : 150}px, 62px)` }}><circle r="12" /><text textAnchor="middle" y="4">{defender?.overall_rating ?? ''}</text></g>
      <g className="dribble-attacker" style={{ transform: `translate(${moved ? x : 150}px, ${moved ? (scene.ok ? 36 : 84) : 148}px)` }}><circle r="12" /><text textAnchor="middle" y="4">{attacker?.overall_rating ?? ''}</text></g>
      <circle className="dribble-ball" r="5" style={{ transform: `translate(${moved ? (scene.ok ? x : LANE_X[scene.cover]) : 150}px, ${moved ? (scene.ok ? 24 : 70) : 132}px)` }} />
    </svg>
    <p><strong>{t(scene.ok ? 'dribble.ok' : 'dribble.lost', { lane: t(`dribble.lane.${scene.lane}`), defender: defender?.name ?? '' })}</strong> <small>{t('dribble.revealed', { lane: t(`dribble.lane.${scene.cover}`) })}</small></p>
  </section>
}
