import { useTranslation } from 'react-i18next'
import type { TeamStrength } from './teamStrength'

/** Large figure for a team's power: global once the eleven is complete, provisional mean level before. */
export function PowerBadge({ strength }: { readonly strength: TeamStrength }) {
  const { t } = useTranslation()
  if (strength.kind === 'none') return <p className="power-badge power-badge-empty"><span>{t('power.global')}</span><strong aria-hidden="true">—</strong></p>
  const label = strength.kind === 'global' ? t('power.global') : t('power.average', { count: strength.count })
  return <p className={`power-badge power-badge-${strength.kind}`} aria-label={`${label}: ${strength.value.toFixed(1)}`}><span>{label}</span><strong>{strength.value.toFixed(1)}</strong></p>
}
