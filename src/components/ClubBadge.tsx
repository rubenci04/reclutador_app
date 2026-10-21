import { useId, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { getClubVisual } from '../features/player-catalog/clubVisuals'
import { KitFill } from './KitFill'
import { getClubIdentity } from '../features/player-catalog/clubRegistry'

/** Original game token: the same shield for every club, split into the two club colours. */
export function ClubBadge({ clubId, fallbackName }: { readonly clubId: string; /** Editorial club name shown when the club has no approved identity. */ readonly fallbackName?: string }) {
  const { t } = useTranslation()
  const visual = getClubVisual(clubId)
  const identity = getClubIdentity(clubId)
  const name = identity?.name || fallbackName || t('clubBadge.unknown')
  const clipId = useId().replace(/:/g, '')
  const style = { '--club-primary': visual.primary, '--club-secondary': visual.secondary, '--club-contrast': visual.contrast } as CSSProperties
  return <span className="club-identity" data-club-id={clubId}>
    <span className="club-badge" role="img" aria-label={t(visual.id === 'neutral' ? identity || fallbackName ? 'playerClubs.neutralFor' : 'clubBadge.neutral' : 'clubBadge.label', { club: name })} style={style}>
      <svg viewBox="0 0 40 48" aria-hidden="true"><defs><clipPath id={clipId}><path d="M3 3h34v24c0 7-8 13-17 18C11 40 3 34 3 27Z" /></clipPath></defs><g clipPath={`url(#${clipId})`}><KitFill pattern={visual.pattern ?? 'duo'} primary={visual.primary} secondary={visual.secondary} x={0} y={0} width={40} height={48} /></g><path d="M3 3h34v24c0 7-8 13-17 18C11 40 3 34 3 27Z" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M10 10h20M20 12v22" stroke="currentColor" strokeWidth="1.5" opacity=".6" /></svg>
    </span>
    <span className="club-name">{name}</span>
  </span>
}
