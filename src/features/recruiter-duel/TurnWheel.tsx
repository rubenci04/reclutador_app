import { useTranslation } from 'react-i18next'
import type { RecruiterId } from './auctionTypes'

interface TurnWheelProps {
  readonly names: Record<RecruiterId, string>
  readonly winner: RecruiterId
}

/** The engine already chose the winner. This wheel only presents that stored result. */
export function TurnWheel({ names, winner }: TurnWheelProps) {
  const { t } = useTranslation()
  return <div className="turn-wheel-scene" aria-label={t('wheel.spinning')} role="img">
    <div className="turn-wheel-pointer" aria-hidden="true" />
    <div className={`turn-wheel-disc ${winner === 'recruiter_one' ? 'turn-wheel-one' : 'turn-wheel-two'}`} aria-hidden="true">
      <span className="turn-wheel-name turn-wheel-name-one">{names.recruiter_one}</span>
      <span className="turn-wheel-name turn-wheel-name-two">{names.recruiter_two}</span>
      <span className="turn-wheel-hub">⚽</span>
    </div>
  </div>
}
