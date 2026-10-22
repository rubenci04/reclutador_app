import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { SUBSTITUTE_POSITIONS } from './matchConfig'
import { benchStatus, substituteMarket } from './auctionEngine'
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
/** bench-5-v1 also offers a goalkeeper line. */
const V2_LINES = ['ARQ', ...SUBSTITUTE_POSITIONS] as const

/** Optional step: spend what is left on one substitute per line. Shows only what the recruiter can afford. */
export function SubstituteMarket({ game, participant, name, catalog, locked, onBuy }: Props) {
  const { t } = useTranslation()
  const team = game.teams[participant]
  const left = (game.config?.budget ?? 100) - team.spent
  const market = substituteMarket(game, participant, catalog)
  const signed = (team.bench ?? []).flatMap((slot) => catalog.filter((player) => player.id === slot.playerId))
  const v2 = !!game.config?.bench
  const { filled, limit } = benchStatus(game, participant)
  /** The bench step is optional: the recruiter may close it at any time and reopen it while the squads are not locked. */
  const [finished, setFinished] = useState(false)
  const hasOptions = market.length > 0 && !(v2 && finished)
  if (!market.length && !signed.length) return null
  return <section className="substitute-market" aria-label={t('market.title', { name })}>
    <h3>{t('market.title', { name })}</h3>
    {v2 && <p className="market-counter" role="status" aria-label={t('market.counter', { count: filled, limit })}><b>{filled}/{limit}</b> {t('market.counterLabel')}</p>}
    <p className="market-left">{t(v2 ? 'market.leftV2' : game.manualBench ? 'playtest.marketLeft' : 'market.left', { amount: left, limit })}</p>
    {signed.length > 0 && <ul className="market-signed">{signed.map((player) => <li key={player.id}>{t('market.signed', { player: player.name, position: t(`positions.${player.position}`), price: player.price })}</li>)}</ul>}
    {hasOptions && !locked && (v2 ? V2_LINES : SUBSTITUTE_POSITIONS).map((position) => {
      const options = market.filter((player) => player.position === position).slice(0, PER_LINE)
      if (!options.length) return null
      return <div key={position} className="market-line"><strong>{t(`positions.${position}`)}</strong>
        <div className="market-options">{options.map((player) => <button key={player.id} className="secondary-action" onClick={() => onBuy(player.id)}>{t('market.option', { player: player.name, rating: player.overall_rating, price: player.price })}</button>)}</div>
      </div>
    })}
    {hasOptions && locked && <p>{t('market.closed')}</p>}
    {hasOptions && !locked && <p className="market-hint">{t(game.manualBench ? 'playtest.manualBench' : 'market.hint')}</p>}
    {v2 && !locked && filled >= limit && <p className="market-hint">{t('market.full', { count: filled, limit })}</p>}
    {v2 && !locked && market.length > 0 && <button className="secondary-action market-finish" onClick={() => setFinished(!finished)}>{t(finished ? 'market.reopen' : 'market.finish')}</button>}
    {v2 && !locked && finished && <p className="market-hint" role="status">{t('market.finished', { count: filled, limit })}</p>}
  </section>
}
