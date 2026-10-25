import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { budgetOf, type auctionAvailability, type positionProgress } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import type { HudModel } from './hudModel'

const RISK_SYMBOL = { safe: '✓', warn: '!', danger: '✕' } as const

type Availability = ReturnType<typeof auctionAvailability>

interface Props {
  readonly game: RecruiterDuelGame
  readonly side: RecruiterId
  readonly footballer: Player
  readonly names: Readonly<Record<RecruiterId, string>>
  readonly availability: Availability | null
  readonly offer: number
  readonly minimum: number
  readonly onOffer: (value: number) => void
  readonly blockedMessage: string | null
  readonly progress: ReturnType<typeof positionProgress> | null
  readonly hud: HudModel | null
  readonly passLabel: string
  /** Consequence of passing; shown prominently only when it is an exceptional case (replacement, mandatory award). */
  readonly assignment: ReactNode
  readonly assignmentSpecial: boolean
  readonly onBid: () => void
  readonly onPass: () => void
}

/**
 * Active bid phase organised around three things: the footballer in play, the offer and balance, and the two main buttons.
 * The engine stays the source of truth: every figure and every enabled state comes from `availability`.
 */
export function AuctionBidPanel({ game, side, footballer, names, availability, offer, minimum, onOffer, blockedMessage, progress, hud, passLabel, assignment, assignmentSpecial, onBid, onPass }: Props) {
  const { t } = useTranslation()
  const rival = names[side === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one']
  const blocked = availability?.bid.reason
  const maximum = availability?.maximum ?? 0
  const base = Number.isNaN(offer) ? minimum : offer
  const ratio = maximum > 0 ? base / maximum : 1
  const level = !availability?.bid.enabled || maximum < minimum || ratio > .9 ? 'danger' : ratio > .6 ? 'warn' : 'safe'
  const participant = hud?.participants[side]
  const missing = participant ? hud!.teamSize - participant.signed : null
  const needs = participant ? participant.positions.filter((position) => position.remaining > 0) : []
  const remaining = participant?.remaining ?? budgetOf(game) - game.teams[side].spent
  const reserved = participant?.reserved ?? Math.max(0, remaining - maximum)
  const showBlocked = blockedMessage && (blocked === 'POSITION_FULL' || blocked === 'FUTURE_BUDGET_RESERVED' || blocked === 'INSUFFICIENT_BUDGET')
  return <section className={`bid-panel bid-panel-${side}`}>
    <header className="bid-turn">
      <p className="turn-strip"><span className="dealer-puck" role="img" aria-label={t('bidTable.dealer', { name: names[side] })}>●</span><span>{t('bidTable.turnNow')}</span></p>
      {missing !== null && <p className="team-status">{missing > 0 && missing <= 2 && <strong className="team-needs">{t('auctionFocus.needs', { positions: needs.map((position) => `${position.position}${position.remaining > 1 ? ` ×${position.remaining}` : ''}`).join(', ') })}</strong>}</p>}
    </header>
    {showBlocked
      ? <div className="auction-banner auction-banner-blocked" role="alert"><strong>{blockedMessage}</strong></div>
      : <div className="auction-banner" role="status"><strong>{game.currentBid ? t('auctionBanner.rivalBid', { rival, amount: game.currentBid.amount }) : t('auctionBanner.open')}</strong></div>}
    <dl className={`bid-figures${game.currentBid ? ' has-bid' : ''}`}>
      <div className="figure-current" key={game.currentBid?.amount ?? 0}><dt>{t('auctionFocus.current')}</dt><dd>{game.currentBid ? `${game.currentBid.amount}M` : '—'}<small>{game.currentBid ? names[game.currentBid.participant] : t('duel.noBid')}</small></dd></div>
      <div><dt>{t('auctionFocus.minimum')}</dt><dd>{minimum}M</dd></div>
    </dl>
    <div className="bid-chips" role="group" aria-label={t('bidTable.chipsLabel')}>
      <button type="button" className="bid-chip" disabled={maximum < minimum} onClick={() => onOffer(minimum)}>{t('bidTable.min', { amount: minimum })}</button>
      {[1, 2, 5].map((step) => <button key={step} type="button" className="bid-chip" disabled={base + step > maximum} onClick={() => onOffer(base + step)}>{t('bidTable.plus', { amount: step })}</button>)}
      <button type="button" className="bid-chip bid-chip-max" disabled={maximum < minimum} onClick={() => onOffer(maximum)}>{t('bidTable.max', { amount: maximum })}</button>
    </div>
    <div className={`risk-row risk-${level}`}>
      <div className={`risk-meter risk-${level}`} role="img" aria-label={t('bidTable.riskLabel', { level: t(`bidTable.risk.${level}`) })}><i style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }} /></div>
      {/* Level in words and in a shape, so it never depends on colour alone. */}
      <span className="risk-text" aria-hidden="true"><span className="risk-symbol">{RISK_SYMBOL[level]}</span> {t(`bidTable.riskText.${level}`)}</span>
    </div>
    <p className="budget-breakdown"><span>{t('budgetBreakdown.balance', { remaining })}</span> · <span>{t('budgetBreakdown.reserved', { reserved })}</span> · <strong>{t('budgetBreakdown.offerable', { maximum })}</strong></p>
    <label className="bid-amount">{t('duel.offerAmount')}<input type="number" min={game.currentBid ? game.currentBid.amount + 1 : footballer.price} max={availability?.maximum} value={Number.isNaN(offer) ? '' : offer} onChange={(event) => onOffer(event.target.value === '' ? NaN : Number(event.target.value))} /></label>
    <p id="auction-action-reason" className="sr-only" role="status">{availability?.bid.reason ? t('auctionActions.blocks.' + availability.bid.reason) : t('auctionActions.available')}</p>
    <div className="duel-actions bid-actions">
      <span className="blockable"><button className="primary-action bid-primary" aria-describedby="auction-action-reason position-capacity" disabled={!availability?.bid.enabled} onClick={onBid}>{t('duel.bid')}</button></span>
      <span className="blockable"><button className={`secondary-action bid-pass${assignmentSpecial ? ' bid-pass-special' : ''}`} aria-describedby="auction-assignment" disabled={!availability?.pass.enabled} onClick={onPass}>{passLabel}</button></span>
    </div>
    {assignmentSpecial && <div className="assignment-notice-slot">{assignment}</div>}
    <details className="bid-details"><summary>{t('auctionFocus.moreInfo')}</summary>
      <ul><li>{t('auctionBanner.ifBid', { amount: Number.isNaN(offer) ? minimum : offer, rival })}</li><li>{game.currentBid ? t('auctionBanner.ifPass', { rival, player: footballer.name, amount: game.currentBid.amount }) : t('auctionBanner.ifPassNoBid', { rival })}</li></ul>
      <p>{t('auctionUX.reserve', { amount: participant?.reserved ?? '—' })}</p>
      {!assignmentSpecial && <div className="assignment-notice-slot">{assignment}</div>}
      {progress && <p id="position-capacity">{t(progress.remaining ? 'teamProgress.missing' : 'teamProgress.full', { position: t(`positions.${footballer.position}`), ...progress })}</p>}
    </details>
  </section>
}
