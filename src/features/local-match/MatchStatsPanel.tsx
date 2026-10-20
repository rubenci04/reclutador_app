import { useTranslation } from 'react-i18next'
import type { MatchSide, MatchStats } from './matchTypes'

function share(local: number, cpu: number) { return local + cpu === 0 ? 50 : (local / (local + cpu)) * 100 }

/** Statistics with a bar per row, shared by the replay and the live screen. */
export function MatchStatsPanel({ stats }: { readonly stats: Readonly<Record<MatchSide, MatchStats>> }) {
  const { t } = useTranslation()
  return <section className="match-stats"><h2>{t('match.statistics')}</h2>{(['shots', 'shotsOnTarget', 'saves', 'recoveries', 'possession'] as const).map((stat) => <div key={stat}><span>{stats.local[stat]}{stat === 'possession' ? '%' : ''}</span><small>{t(`match.${stat === 'shotsOnTarget' ? 'onTarget' : stat}`)}</small><span>{stats.cpu[stat]}{stat === 'possession' ? '%' : ''}</span><div className="stat-bar" aria-hidden="true"><i style={{ width: `${share(stats.local[stat], stats.cpu[stat])}%` }} /></div></div>)}</section>
}
