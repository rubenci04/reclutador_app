import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { buildWalletModel } from './hudModel'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

interface Props {
  readonly game: RecruiterDuelGame
  readonly catalog: readonly Player[]
  readonly side: RecruiterId
  readonly name: string
  /** Optional shortcut to the full scoreboard (auction phases). */
  readonly onShowHud?: () => void
}

/** Permanent compact wallet of the participant who is acting: balance first, then the engine's maximum bid, with a link to the full breakdown. */
export function Wallet({ game, catalog, side, name, onShowHud }: Props) {
  const { t } = useTranslation()
  const wallet = buildWalletModel(game, catalog, side)
  const share = Math.max(0, Math.min(100, (wallet.remaining / wallet.budget) * 100))
  return <aside className={`wallet-bar wallet-${side}`} aria-label={t('wallet.label', { name })} data-testid="wallet">
    <svg className="wallet-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a3 3 0 0 1 3-3h11v3H6a1 1 0 0 0 0 2h14a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3Zm14 6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" /></svg>
    <span className="wallet-name">{name}</span>
    <b className="wallet-balance" role="status" aria-live="polite"><span className="sr-only">{t('wallet.balanceLabel')} </span>{t('wallet.amount', { amount: wallet.remaining })}</b>
    <span className="wallet-row"><span className="wallet-meter" aria-hidden="true"><i style={{ width: `${share}%` }} /></span>
    <span className="wallet-chips">
      {wallet.reserve > 0 && <small className="wallet-chip">{t('wallet.reserve', { amount: wallet.reserve })}</small>}
      {wallet.maxBid !== null && <small className="wallet-chip wallet-max">{t('wallet.maxBid', { amount: wallet.maxBid })}</small>}
    </span></span>
    <details className="wallet-details"><summary>{t('wallet.details')}</summary>
      <ul><li>{t('wallet.total', { amount: wallet.budget })}</li><li>{t('hud.spent', { amount: wallet.spent })}</li><li>{t('wallet.balance', { amount: wallet.remaining })}</li>{wallet.reserve > 0 && <li>{t('wallet.reserve', { amount: wallet.reserve })}</li>}{wallet.maxBid !== null && <li>{t('wallet.maxBid', { amount: wallet.maxBid })}</li>}{onShowHud && <li><button type="button" className="secondary-action" onClick={onShowHud}>{t('wallet.showHud')}</button></li>}</ul>
    </details>
  </aside>
}
