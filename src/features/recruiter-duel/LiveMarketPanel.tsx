import { useTranslation } from 'react-i18next'
import type { LiveMarket } from './liveMarket'

/** Compact central panel: one headline (always the same height, so nothing below it moves) and a collapsed recent history. */
export function LiveMarketPanel({ market }: { readonly market: LiveMarket }) {
  const { t } = useTranslation()
  if (!market.headline && !market.history.length) return null
  return <section className="live-market" aria-label={t('liveMarket.title')}>
    <p className="live-market-title">{t('liveMarket.title')}</p>
    <p className={`live-market-headline live-${market.headline?.kind ?? 'empty'}`} role="status" aria-live="polite" key={market.headline?.key}>{market.headline?.text ?? t('liveMarket.empty')}</p>
    {market.history.length > 0 && <details className="live-market-history"><summary>{t('liveMarket.history')}</summary>
      <ol>{market.history.map((event) => <li key={event.key} className={`live-${event.kind}`}>{event.text}</li>)}</ol>
    </details>}
  </section>
}
