import { useTranslation } from 'react-i18next'
import { rankBracket, type RankBadge } from '../player-catalog/categoryRanking'

/** The ranking is a reward for the signing: it appears only once the award is confirmed, never while the footballer is on sale. */
export function SigningReveal({ rank }: { readonly rank: RankBadge | null }) {
  const { t } = useTranslation()
  if (!rank) return null
  return <div className="signing-reveal" role="status">
    <strong>{t('ranking.signed')}</strong>
    <b className="signing-reveal-rank" aria-label={t('ranking.badge', { rank: rank.rank, total: rank.total })}>{t('ranking.reveal', { bracket: rankBracket(rank), rank: rank.rank, total: rank.total })}</b>
  </div>
}
