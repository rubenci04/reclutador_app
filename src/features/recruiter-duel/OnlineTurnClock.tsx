import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import type { OnlineDuelBinding } from './onlineBinding'
import { BID_TURN_SECONDS, CLAIM_GRACE_SECONDS, STRATEGY_SECONDS, formatClock, pendingSide } from './turnClock'

interface Props {
  readonly game: RecruiterDuelGame
  readonly online: OnlineDuelBinding
  readonly names: Readonly<Record<RecruiterId, string>>
}

const other = (side: RecruiterId): RecruiterId => (side === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one')
/** Countdown for the turn in progress (text and bar, no sound), and the claim of the win when the rival does not answer. */
export function OnlineTurnClock({ game, online, names }: Props) {
  const { t } = useTranslation()
  const offset = online.clockOffsetMs ?? 0
  // Server time: the device clock corrected by the offset measured when the last snapshot arrived.
  const [now, setNow] = useState(() => Date.now())
  const deadline = online.deadlineAt ? Date.parse(online.deadlineAt) : NaN
  useEffect(() => {
    if (!Number.isFinite(deadline)) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])
  const pending = pendingSide(game, online)
  if (!Number.isFinite(deadline) || !pending) return null
  const mine = pending === online.mySide
  const remaining = (deadline - (now + offset)) / 1000
  const total = game.phase === 'BIDDING' ? BID_TURN_SECONDS : STRATEGY_SECONDS
  const time = formatClock(remaining)
  const late = pending
  const claimable = !mine && remaining <= -CLAIM_GRACE_SECONDS && !!online.claimTimeout
  // Screen readers hear a polite notice only at 30 s and 10 s, never every second.
  const warning = remaining <= 0 ? null : remaining <= 10 ? 10 : remaining <= 30 ? 30 : null
  return <div className="turn-clock" data-late={remaining <= 0}>
    <p className="turn-clock-text" role="timer" aria-label={mine ? t('online.clock.mineLabel') : t('online.clock.theirsLabel', { name: names[late] })}>
      {remaining <= 0 ? t(mine ? 'online.clock.mineExpired' : 'online.clock.theirsExpired', { name: names[late] }) : t(mine ? 'online.clock.mine' : 'online.clock.theirs', { name: names[late], time })}
    </p>
    <div className="turn-clock-bar" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (remaining / total) * 100))}%` }} /></div>
    <p className="sr-only" role="status" aria-live="polite">{warning && mine ? t('online.clock.warning', { seconds: warning }) : ''}{claimable ? t('online.clock.canClaim', { name: names[late] }) : ''}</p>
    {claimable && <div className="turn-clock-claim" role="alert">
      <p>{t('online.clock.claimExplain', { name: names[late] })}</p>
      <ConfirmNavigation label={t('online.clock.claim', { name: names[late] })} message={t('online.clock.claimConfirm', { name: names[late], winner: names[other(late)] })} onConfirm={() => online.claimTimeout?.()} />
    </div>}
  </div>
}
