import { useTranslation } from 'react-i18next'
import type { CoinSide } from './auctionTypes'

export function FootballCoin({ side, tossing = false }: { readonly side: CoinSide; readonly tossing?: boolean }) {
  const { t } = useTranslation()
  return <div className={`football-coin ${tossing ? 'tossing' : ''}`} data-side={side} role="img" aria-label={tossing ? t('duel.coinTossWaiting') : t('coin.side', { side: t(`duel.${side}`) })}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" /><circle className="coin-rim" cx="50" cy="50" r="38" />{side === 'heads' ? <><path d="m50 25 18 13-7 22H39l-7-22Z" /><path className="coin-detail" d="m32 38-14 7m21 15-9 18m31-18 9 18m-2-40 14 7M50 25V12" /></> : <><path className="coin-detail" d="M28 25h44v50H28ZM28 50h44" /><circle className="coin-rim" cx="50" cy="50" r="10" /></>}</svg>
    <span>{tossing ? t('duel.coinToss') : t(`duel.${side}`)}</span>
  </div>
}
