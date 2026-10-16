import { useTranslation } from 'react-i18next'
import { PITCH_SLOTS } from '../../data/initialSetup'

export function Pitch() {
  const { t } = useTranslation()
  return <div className="pitch" role="img" aria-label={t('home.pitchLabel')}>
    <div className="pitch-boundary" aria-hidden="true">
      <div className="halfway" /><div className="center-circle" /><div className="center-spot" />
      <div className="penalty top" /><div className="penalty bottom" />
      <div className="goal-area top" /><div className="goal-area bottom" />
    </div>
    {PITCH_SLOTS.map((slot, index) => <div key={index} className={`pitch-slot ${slot.position === 'ARQ' ? 'keeper' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} aria-hidden="true">
      <span className="slot-plus">+</span><span className="slot-label">{t(`positions.${slot.position}`)}</span>
    </div>)}
  </div>
}
