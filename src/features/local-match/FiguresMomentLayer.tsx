import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Moment } from './engine/figuresModel'
import { NEUTRAL_PRECISION, useTapOnce, usePrecisionBar } from './precisionSetting'
import { PrecisionBarToggle } from './PrecisionBarToggle'
import { TimingBar } from './TimingBar'
import { useTimingBar } from './timing'

interface Props {
  readonly moment: Moment
  /** Shown in hot-seat, where both people take turns. */
  readonly playerName?: string
  readonly onResolve: (quality: number) => void
}

/**
 * The match is paused and one decision waits. One tap resolves it with no further confirmation: with the precision bar off the
 * quality is neutral, with it on the tap stops the moving bar and the quality is how near the middle it stopped.
 */
export function FiguresMomentLayer({ moment, playerName, onResolve }: Props) {
  const { t } = useTranslation()
  const bar = usePrecisionBar()
  const timing = useTimingBar(bar)
  const tapOnce = useTapOnce()
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => { button.current?.focus({ preventScroll: true }) }, [moment.segment])
  const act = () => tapOnce(() => onResolve(bar ? timing.stop() : NEUTRAL_PRECISION))
  return <div className="fm-moment" role="dialog" aria-modal="true" aria-labelledby="fm-moment-title">
    {playerName && <p className="fm-moment-turn">{t('fm.moment.turnOf', { name: playerName })}</p>}
    <h2 id="fm-moment-title">{t(`fm.moment.${moment.type}`)}</h2>
    {bar && <TimingBar marker={timing.marker} label={t('fm.moment.bar')} />}
    <p className="fm-moment-hint">{t(bar ? 'fm.moment.bar' : 'fm.moment.tap')}</p>
    <button ref={button} type="button" className="primary-action fm-moment-go" onClick={act}>{t(bar ? 'fm.moment.stop' : 'fm.moment.go')}</button>
    <PrecisionBarToggle />
  </div>
}
