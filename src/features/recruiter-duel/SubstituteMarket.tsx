import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { SUBSTITUTE_POSITIONS } from './matchConfig'
import { substituteMarket } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

interface Props {
  readonly game: RecruiterDuelGame
  readonly participant: RecruiterId
  readonly name: string
  readonly catalog: readonly Player[]
  /** True once the strategy step started: the squads are closed. */
  readonly locked: boolean
  readonly onBuy: (playerId: string) => void
}

const PER_LINE = 3

/** Optional step: spend what is left on one substitute per line. Shows only what the recruiter can afford. */
export function SubstituteMarket({ game, participant, name, catalog, locked, onBuy }: Props) {
  const { t } = useTranslation()
  const team = game.teams[participant]
  const left = (game.config?.budget ?? 100) - team.spent
  const market = substituteMarket(game, participant, catalog)
  const signed = (team.bench ?? []).flatMap((slot) => catalog.filter((player) => player.id === slot.playerId))
  const hasOptions = market.length > 0
  if (!hasOptions && !signed.length) return null
  return <section className="substitute-market" aria-label={t('market.title', { name })}>
    <h3>{t('market.title', { name })}</h3>
    <p className="market-left">{t(game.manualBench ? 'playtest.marketLeft' : 'market.left', { amount: left })}</p>
    {signed.length > 0 && <ul className="market-signed">{signed.map((player) => <li key={player.id}>{t('market.signed', { player: player.name, position: t(`positions.${player.position}`), price: player.price })}</li>)}</ul>}
    {hasOptions && !locked && SUBSTITUTE_POSITIONS.map((position) => {
      const options = market.filter((player) => player.position === position).slice(0, PER_LINE)
      if (!options.length) return null
      return <div key={position} className="market-line"><strong>{t(`positions.${position}`)}</strong>
        <div className="market-options">{options.map((player) => <button key={player.id} className="secondary-action" onClick={() => onBuy(player.id)}>{t('market.option', { player: player.name, rating: player.overall_rating, price: player.price })}</button>)}</div>
      </div>
    })}
    {hasOptions && locked && <p>{t('market.closed')}</p>}
    {hasOptions && !locked && <p className="market-hint">{t(game.manualBench ? 'playtest.manualBench' : 'market.hint')}</p>}
  </section>
}
