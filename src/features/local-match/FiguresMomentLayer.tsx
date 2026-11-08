import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Moment } from './engine/figuresModel'
import { createSeededRandom } from './seededRandom'
import { NEUTRAL_PRECISION, useTapOnce, usePrecisionBar } from './precisionSetting'
import { PrecisionBarToggle } from './PrecisionBarToggle'
import { TimingBar } from './TimingBar'
import { useTimingBar } from './timing'

interface Props {
  readonly moment: Moment
  readonly seed: string
  /** Shown in hot-seat, where both people take turns. */
  readonly playerName?: string
  readonly onResolve: (quality: number) => void
}

/**
 * The match waits for a human quality. The selected lane and timing determine it; the opposing lane is fixed from a separate,
 * presentation-only seed before the player acts. This never consumes the match engine's random stream.
 */
const LANES = ['LEFT', 'CENTER', 'RIGHT'] as const
type Lane = (typeof LANES)[number]
const goalTypes = new Set<Moment['type']>(['shot', 'free-kick', 'penalty', 'save'])
const laneX = (lane: Lane) => `${lane === 'LEFT' ? 20 : lane === 'RIGHT' ? 80 : 50}%`

export function FiguresMomentLayer({ moment, seed, playerName, onResolve }: Props) {
  const { t } = useTranslation()
  const bar = usePrecisionBar()
  const timing = useTimingBar(bar)
  const tapOnce = useTapOnce()
  const [lane, setLane] = useState<Lane>('CENTER')
  const [kicked, setKicked] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => { button.current?.focus({ preventScroll: true }) }, [moment.segment])
  const defensive = moment.type === 'save' || moment.type === 'defense'
  const cover = LANES[Math.floor(createSeededRandom(`${seed}:figure-mini:${moment.segment}:${moment.type}:${moment.side}`)() * LANES.length)]
  const act = () => {
    const precision = bar ? timing.stop() : NEUTRAL_PRECISION
    const edge = defensive ? lane === cover ? .1 : -.06 : lane === cover ? -.1 : .06
    const quality = Math.max(0, Math.min(1, precision + edge))
    setKicked(true)
    tapOnce(() => onResolve(quality))
  }
  const goal = goalTypes.has(moment.type)
  return <div className="fm-moment" role="dialog" aria-modal="true" aria-labelledby="fm-moment-title">
    {playerName && <p className="fm-moment-turn">{t('fm.moment.turnOf', { name: playerName })}</p>}
    <h2 id="fm-moment-title">{t(`fm.moment.${moment.type}`)}</h2>
    <p className="fm-mini-instruction">{t(defensive ? 'figureMini.defend' : 'figureMini.attack')}</p>
    <div className={`fm-mini-arena${goal ? ' is-goal' : ' is-field'}${kicked ? ' is-kicked' : ''}`} aria-hidden="true">
      {goal && <div className="fm-mini-net" />}
      {moment.type === 'free-kick' && <div className="fm-mini-wall"><i /><i /><i /></div>}
      <div className="fm-mini-keeper" style={{ left: kicked ? laneX(defensive ? lane : cover) : '50%' }} />
      <div className="fm-mini-ball" style={{ left: kicked ? laneX(defensive ? cover : lane) : '50%', top: kicked ? '24%' : '82%' }} />
    </div>
    <div className="fm-mini-lanes" role="group" aria-label={t('figureMini.lanes')}>
      {LANES.map((value) => <button key={value} type="button" className={`fm-mini-lane${lane === value ? ' is-selected' : ''}`} aria-pressed={lane === value} disabled={kicked} onClick={() => setLane(value)}>{t(`shot.lane.${value}`)}</button>)}
    </div>
    {bar && <TimingBar marker={timing.marker} label={t('fm.moment.bar')} />}
    <p className="fm-moment-hint">{t(bar ? 'fm.moment.bar' : 'fm.moment.tap')}</p>
    <button ref={button} type="button" className="primary-action fm-moment-go" disabled={kicked} onClick={act}>{t(bar ? 'fm.moment.stop' : 'fm.moment.go')}</button>
    <PrecisionBarToggle />
  </div>
}
