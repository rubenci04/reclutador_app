import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { buildWalletModel, type HudModel } from './hudModel'

interface Props {
  readonly game: RecruiterDuelGame
  readonly catalog: readonly Player[]
  readonly side: RecruiterId
  readonly name: string
  readonly hud: HudModel
  /** Online only: the countdown of the turn in progress. */
  readonly clock?: ReactNode
}

/**
 * The single sticky header of the auction: team, balance, signings, discards and round. Every figure comes from the engine
 * (wallet model and scoreboard model); the maximum bid lives only next to the offer controls.
 */
export function AuctionHeader({ game, catalog, side, name, hud, clock }: Props) {
  const { t } = useTranslation()
  const wallet = buildWalletModel(game, catalog, side)
  const me = hud.participants[side]
  return <header className={`auction-header wallet-${side}`} aria-label={t('wallet.label', { name })} data-testid="auction-header">
    <svg className="wallet-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a3 3 0 0 1 3-3h11v3H6a1 1 0 0 0 0 2h14a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3Zm14 6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" /></svg>
    <span className="wallet-name">{name}</span>
    <b className="wallet-balance" role="status" aria-live="polite"><span className="sr-only">{t('wallet.balanceLabel')} </span>{t('wallet.amount', { amount: wallet.remaining })}</b>
    <ul className="auction-header-stats">
      <li>{t('hud.signings', { count: me.signed, total: hud.teamSize })}</li>
      {hud.discardsTotal > 0 && <li>{t('hud.discards', { count: hud.discardsRemaining, total: hud.discardsTotal })}</li>}
      <li>{t('duel.round', { current: game.roundIndex + 1, total: game.rounds.length })}</li>
    </ul>
    {clock}
    <details className="wallet-details"><summary>{t('wallet.details')}</summary>
      <ul><li>{t('wallet.total', { amount: wallet.budget })}</li><li>{t('hud.spent', { amount: wallet.spent })}</li>{wallet.reserve > 0 && <li>{t('wallet.reserve', { amount: wallet.reserve })}</li>}</ul>
    </details>
  </header>
}
