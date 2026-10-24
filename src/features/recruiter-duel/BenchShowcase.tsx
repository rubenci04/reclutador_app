import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { benchLimitOf } from './matchConfig'
import { benchShowcase, showcaseClosed, showcaseTurn, showcaseUsed, soldTo, SHOWCASE_SIZE } from './benchShowcaseModel'
import { budgetOf } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

interface Props {
  readonly game: RecruiterDuelGame
  readonly catalog: readonly Player[]
  readonly names: Readonly<Record<RecruiterId, string>>
  /** Participants who decide with this screen (the CPU decides on its own chances). */
  readonly humans: readonly RecruiterId[]
  readonly onBuy: (participant: RecruiterId, playerId: string) => void
  readonly onPass: (participant: RecruiterId) => void
  readonly onFinish: (participant: RecruiterId) => void
}

const LINES = ['ARQ', 'DEF', 'MED', 'DEL'] as const

/** One fixed showcase of ten cards for both participants: bought cards stay visible as SOLD, nothing replaces them. */
export function BenchShowcase({ game, catalog, names, humans, onBuy, onPass, onFinish }: Props) {
  const { t } = useTranslation()
  const cards = benchShowcase(game, catalog)
  const turn = showcaseTurn(game, catalog)
  const closed = showcaseClosed(game, catalog)
  const limit = benchLimitOf(game.config)
  const mine = turn !== null && humans.includes(turn)
  const budgetLeft = (id: RecruiterId) => budgetOf(game) - game.teams[id].spent
  const owned = (id: RecruiterId) => cards.filter((card) => soldTo(game, card.id) === id).length
  if (turn === null && !closed) return <section className="bench-showcase bench-showcase-waiting" aria-label={t('showcase.label')}><h3>{t('showcase.title')}</h3><p className="showcase-turn" role="status" aria-live="polite">{t('showcase.waiting')}</p></section>
  return <section className="bench-showcase" aria-label={t('showcase.label')}>
    <h3>{t('showcase.title')}</h3>
    <p className="market-hint">{t('showcase.rules', { limit })}</p>
    <ul className="showcase-scores">{(['recruiter_one', 'recruiter_two'] as const).map((id) => <li key={id} className={turn === id ? 'is-turn' : undefined}><strong>{names[id]}</strong> <b>{owned(id)}/{limit}</b> · {t('showcase.left', { amount: budgetLeft(id) })}</li>)}</ul>
    <p className="showcase-turn" role="status" aria-live="polite">{turn === null ? t(closed ? 'showcase.closed' : 'showcase.waiting') : t('showcase.turn', { name: names[turn], used: showcaseUsed(game) + 1, total: SHOWCASE_SIZE })}</p>
    {LINES.map((position) => <div key={position} className="market-line"><strong>{t(`positions.${position}`)}</strong>
      <div className="market-options">{cards.filter((card) => card.position === position).map((card) => {
        const owner = soldTo(game, card.id)
        const affordable = turn !== null && card.price <= budgetLeft(turn)
        return <div key={card.id} className={`showcase-card${owner ? ' is-sold' : ''}`} data-sold={owner ? 'true' : 'false'}>
          <span className="showcase-name">{card.name}</span><b className="showcase-ovr">{card.overall_rating}</b><small>{t('showcase.price', { price: card.price })}</small>
          {owner ? <em className="showcase-badge">{t('showcase.sold', { name: names[owner] })}</em>
            : <button className="secondary-action" disabled={!mine || !affordable} onClick={() => turn && onBuy(turn, card.id)}>{t('showcase.buy')}</button>}
        </div>
      })}</div></div>)}
    {mine && turn && <div className="showcase-actions"><button className="secondary-action" onClick={() => onPass(turn)}>{t('showcase.pass')}</button><button className="secondary-action" onClick={() => onFinish(turn)}>{t('showcase.finish')}</button></div>}
  </section>
}
