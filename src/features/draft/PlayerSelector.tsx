import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DRAFT_CATALOG } from './catalog'
import { summarizeDraft } from './draftModel'
import { DRAFT_SLOTS, type DraftLineup, type DraftSlot } from './draftTypes'
import type { Position } from '../../types/football'
import { PlayerClubDetails } from '../../components/PlayerClubDetails'

interface PlayerSelectorProps {
  readonly slot: DraftSlot
  readonly lineup: DraftLineup
  readonly onClose: () => void
  readonly onSign: (playerId: string) => void
}

type PriceFilter = 'all' | 'low' | 'medium' | 'high'

function fitsPrice(price: number, filter: PriceFilter) {
  return filter === 'all' || (filter === 'low' && price <= 5) || (filter === 'medium' && price > 5 && price <= 10) || (filter === 'high' && price > 10)
}

export function PlayerSelector({ slot, lineup, onClose, onSign }: PlayerSelectorProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState<Position | 'all'>(slot.position)
  const [price, setPrice] = useState<PriceFilter>('all')
  const [sort, setSort] = useState<'rating' | 'price'>('rating')
  const selectedElsewhere = new Set(DRAFT_SLOTS.filter((item) => item.id !== slot.id).flatMap((item) => lineup[item.id] ? [lineup[item.id]!] : []))
  const shown = useMemo(() => DRAFT_CATALOG
    .filter((player) => player.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (position === 'all' || player.position === position) && fitsPrice(player.price, price))
    .sort((a, b) => sort === 'rating' ? b.overall_rating - a.overall_rating || a.price - b.price : a.price - b.price || b.overall_rating - a.overall_rating), [query, position, price, sort])
  return <div className="selector-backdrop" role="dialog" aria-modal="true" aria-labelledby="selector-title">
    <section className="player-selector">
      <header><div><p className="eyebrow"><span />{slot.id} · {t(`positions.${slot.position}`)}</p><h2 id="selector-title">{t('game.selectPlayer')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('draft.closeCatalog')}>×</button></header>
      <div className="catalog-filters">
        <label>{t('draft.search')}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('draft.search')} /></label>
        <label>{t('draft.position')}<select value={position} onChange={(event) => setPosition(event.target.value as Position | 'all')}><option value="all">{t('draft.allPositions')}</option>{['ARQ', 'DEF', 'MED', 'DEL'].map((value) => <option key={value} value={value}>{t(`positions.${value}`)}</option>)}</select></label>
        <label>{t('draft.filterPrice')}<select value={price} onChange={(event) => setPrice(event.target.value as PriceFilter)}><option value="all">{t('draft.allPrices')}</option><option value="low">{t('draft.priceLow')}</option><option value="medium">{t('draft.priceMedium')}</option><option value="high">{t('draft.priceHigh')}</option></select></label>
        <label>{t('draft.sort')}<select value={sort} onChange={(event) => setSort(event.target.value as 'rating' | 'price')}><option value="rating">{t('draft.ratingHigh')}</option><option value="price">{t('draft.priceLowFirst')}</option></select></label>
      </div>
      <div className="catalog-list" aria-live="polite">
        {shown.map((player) => {
          const proposal = { ...lineup, [slot.id]: player.id }
          const summary = summarizeDraft(proposal, DRAFT_CATALOG)
          const selected = selectedElsewhere.has(player.id)
          const validPosition = player.position === slot.position
          const available = !selected && validPosition && summary.spent <= 100 && summary.canCompleteWithinBudget
          return <article className="catalog-player" key={player.id}>
            <div className="player-card-main"><span className="rating">{player.overall_rating}</span><div><strong>{player.name}</strong><p>{t(`positions.${player.position}`)} · {player.nationality} · {t('draft.rating')} {player.overall_rating}</p><PlayerClubDetails player={player} /></div></div>
            <div className="player-card-meta"><span className={`tier tier-${player.overall_rating >= 90 ? 's' : player.overall_rating >= 84 ? 'a' : 'b'}`}>{t('draft.tier')} {player.overall_rating >= 90 ? 'S' : player.overall_rating >= 84 ? 'A' : 'B'}</span><b>{player.price}M</b><button disabled={!available} onClick={() => onSign(player.id)}>{available ? t('draft.sign') : selected ? t('draft.selectedPlayer') : t('draft.unavailable')}</button></div>
          </article>
        })}
        {!shown.length && <p className="empty-catalog">{t('draft.emptyCatalog')}</p>}
      </div>
    </section>
  </div>
}
