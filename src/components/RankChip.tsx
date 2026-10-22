import { useTranslation } from 'react-i18next'
import type { RankBadge } from '../features/player-catalog/categoryRanking'

/** Small badge «#27 / 150»: the footballer's editorial position in the category being played (not an official rating). */
export function RankChip({ rank }: { readonly rank: RankBadge | null | undefined }) {
  const { t } = useTranslation()
  if (!rank) return null
  return <b className="rank-chip" aria-label={t('ranking.badge', { rank: rank.rank, total: rank.total })} title={t('ranking.hint')}>#{rank.rank} / {rank.total}</b>
}
