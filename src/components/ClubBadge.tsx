import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { getClubVisual } from '../features/player-catalog/clubVisuals'

/** Original game token: identical rounded rectangle and two inset squares for every club. */
export function ClubBadge({ clubId }: { readonly clubId: string }) {
  const { t } = useTranslation()
  const visual = getClubVisual(clubId)
  const name = visual.name || t('clubBadge.unknown')
  const style = { '--club-primary': visual.primary, '--club-secondary': visual.secondary, '--club-contrast': visual.contrast } as CSSProperties
  return <span className="club-identity" data-club-id={clubId}>
    <span className="club-badge" role="img" aria-label={t(visual.id === 'neutral' ? 'clubBadge.neutral' : 'clubBadge.label', { club: name })} style={style}>
      <span aria-hidden="true" /><span aria-hidden="true" />
    </span>
    <span className="club-name">{name}</span>
  </span>
}
