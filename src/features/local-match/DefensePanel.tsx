import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { DribbleSector, PendingPlay, PlayChoice } from './interactive/attackTree'
import { LANE_X } from './DribblePanel'
import { TimingBar } from './TimingBar'
import { reducedMotion, useTimingBar } from './timing'

const LANES: readonly DribbleSector[] = ['LEFT', 'CENTER', 'RIGHT']
type Pick = DribbleSector | 'PRESS'
const choiceOf = (pick: Pick) => (pick === 'PRESS' ? 'PRESS' : `DEFEND_${pick}`) as PlayChoice

function Field({ attacker, defender, pick, intent, moved }: { readonly attacker: Player | undefined; readonly defender: Player | undefined; readonly pick: Pick | null; readonly intent?: DribbleSector; readonly moved?: boolean }) {
  const defenderX = pick && pick !== 'PRESS' ? LANE_X[pick] : 150
  return <>
    <rect x="0" y="0" width="300" height="180" rx="10" className="dribble-grass" />
    {LANES.map((id) => <rect key={id} x={LANE_X[id] - 40} y="8" width="80" height="164" rx="6" className={`dribble-lane${pick === id ? ' is-chosen' : ''}${intent === id ? ' is-covered' : ''}`} />)}
    <path d="M70 172H230" className="shot-posts" fill="none" />
    <g className="dribble-defender" style={{ transform: `translate(${defenderX}px, ${pick === 'PRESS' && moved ? 70 : 128}px)` }}><circle r="12" style={{ fill: '#d5fb76' }} /><text textAnchor="middle" y="4">{defender?.overall_rating ?? ''}</text></g>
    <g className="dribble-attacker" style={{ transform: `translate(${intent ? LANE_X[intent] : 150}px, ${moved ? 96 : 34}px)` }}><circle r="12" style={{ fill: '#ff6b6b' }} /><text textAnchor="middle" y="4">{attacker?.overall_rating ?? ''}</text></g>
  </>
}

/**
 * Hand-played defense (SIM-MINI-003). The CPU already decided which lane its attacker will use (hidden). Step 1: anticipate a lane or press.
 * Step 2: stop the marker near the middle. «Resolve with the traditional system» sends the old automatic interception.
 */
export function DefensePanel({ play, catalog, onChoose }: { readonly play: PendingPlay; readonly catalog: readonly Player[]; readonly onChoose: (choice: PlayChoice, precision?: number) => void }) {
  const { t } = useTranslation()
  const attacker = catalog.find((p) => p.id === play.attackerId); const defender = catalog.find((p) => p.id === play.protagonistId)
  const [pick, setPick] = useState<Pick | null>(null)
  const { marker, stop, motionOff } = useTimingBar(pick !== null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  const confirm = () => { if (pick) onChoose(choiceOf(pick), stop()) }
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') { setPick('LEFT'); event.preventDefault() }
    else if (event.key === 'ArrowRight') { setPick('RIGHT'); event.preventDefault() }
    else if (event.key === 'ArrowUp') { setPick('CENTER'); event.preventDefault() }
    else if (event.key === 'ArrowDown') { setPick('PRESS'); event.preventDefault() }
    else if ((event.key === ' ' || event.key === 'Enter') && pick && event.target === event.currentTarget) { confirm(); event.preventDefault() }
  }
  return <section className="live-play dribble-panel defense-panel" aria-label={t('defenseMini.label')} tabIndex={-1} onKeyDown={keys}>
    <h2 tabIndex={-1} ref={heading}>{t('defenseMini.title')}</h2>
    <p className="live-moment">{t('defenseMini.intro', { attacker: attacker?.name ?? '', defender: defender?.name ?? '' })}</p>
    <div className="dribble-field"><svg className="dribble-pitch" viewBox="0 0 300 180" aria-hidden="true"><Field attacker={attacker} defender={defender} pick={pick} /></svg></div>
    <div className="dribble-lanes defense-picks" role="radiogroup" aria-label={t('defenseMini.picks')}>
      {([...LANES, 'PRESS'] as const).map((id) => <button key={id} type="button" role="radio" aria-checked={pick === id} className={`play-card dribble-lane-button${pick === id ? ' is-chosen' : ''}`} onClick={() => setPick(id)}>
        <b className="play-letter" aria-hidden="true">{id === 'LEFT' ? '←' : id === 'RIGHT' ? '→' : id === 'CENTER' ? '↑' : '↓'}</b><strong>{t(id === 'PRESS' ? 'defenseMini.press' : `defenseMini.anticipate.${id}`)}</strong>
      </button>)}
    </div>
    {pick && !motionOff && <TimingBar marker={marker} label={t('defenseMini.barLabel')} />}
    <div className="dribble-actions">
      <button type="button" className="primary-action" disabled={!pick} onClick={confirm}>{pick ? t(motionOff ? 'defenseMini.confirm' : 'defenseMini.stop') : t('defenseMini.chooseFirst')}</button>
      <button type="button" className="secondary-action" onClick={() => onChoose('INTERCEPT')}>{t('defenseMini.traditional')}</button>
    </div>
    <details className="moment-detail"><summary>{t('moments.detail')}</summary><p>{t('defenseMini.detail')}</p></details>
    <p className="market-hint">{t('defenseMini.hint')}</p>
  </section>
}

export type DefenseResult = 'RECOVERED' | 'BEATEN_BLOCK' | 'BEATEN_WIDE' | 'BEATEN_SAVE' | 'BEATEN_GOAL'
export interface DefenseSceneData { readonly key: string; readonly intent: DribbleSector; readonly pick: Pick; readonly result: DefenseResult; readonly attackerId: string | null; readonly defenderId: string | null }

/** The confirmed defense: the attacker's lane is revealed, the defender goes where it was sent and the engine's outcome plays out. */
export function DefenseScene({ scene, catalog, onDone }: { readonly scene: DefenseSceneData; readonly catalog: readonly Player[]; readonly onDone: () => void }) {
  const { t } = useTranslation()
  const [moved, setMoved] = useState(reducedMotion())
  useEffect(() => {
    const go = window.setTimeout(() => setMoved(true), 30)
    const done = window.setTimeout(onDone, reducedMotion() ? 1800 : 2400)
    return () => { window.clearTimeout(go); window.clearTimeout(done) }
  }, [scene.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const attacker = catalog.find((p) => p.id === scene.attackerId); const defender = catalog.find((p) => p.id === scene.defenderId)
  const good = scene.result === 'RECOVERED' || scene.result === 'BEATEN_BLOCK' || scene.result === 'BEATEN_SAVE'
  return <section className={`dribble-scene defense-scene ${good ? 'is-ok' : 'is-lost'}${moved ? ' is-moved' : ''}`} role="status" aria-live="polite" data-result={scene.result} data-intent={scene.intent} data-pick={scene.pick}>
    <svg className="dribble-pitch" viewBox="0 0 300 180" aria-hidden="true">
      <Field attacker={attacker} defender={defender} pick={scene.pick} intent={moved ? scene.intent : undefined} moved={moved} />
      <circle className="dribble-ball" r="5" style={{ transform: `translate(${LANE_X[scene.intent]}px, ${moved ? (scene.result === 'RECOVERED' ? 120 : scene.result === 'BEATEN_GOAL' ? 176 : scene.result === 'BEATEN_WIDE' ? 176 : 150) : 52}px)` }} />
    </svg>
    <p><strong>{t(`defenseMini.result.${scene.result}`, { attacker: attacker?.name ?? '', defender: defender?.name ?? '' })}</strong> <small>{t('defenseMini.revealed', { lane: t(`defenseMini.lane.${scene.intent}`) })}</small></p>
  </section>
}
