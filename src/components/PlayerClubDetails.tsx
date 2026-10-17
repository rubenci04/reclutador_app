import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../types/player'
import { capturePlayerClubs, CLUB_AUDIT_AS_OF } from '../features/player-catalog/playerClubs'
import { ClubBadge } from './ClubBadge'

/** The date is explicit: future audit files cannot turn a historical card into a current one. */
export function PlayerClubDetails({ player, asOfDate = CLUB_AUDIT_AS_OF }: { readonly player: Player; readonly asOfDate?: string }) {
  const { t } = useTranslation()
  const snapshot = useMemo(() => capturePlayerClubs(player, asOfDate), [player, asOfDate])
  const verified = snapshot.verificationStatus === 'VERIFIED'
  return <span className="player-club-details">
    <span className="club-detail-row"><span className="club-detail-label">{t('playerClubs.current')}</span>
      {verified && snapshot.careerStatus === 'ACTIVE' && snapshot.currentClubId ? <ClubBadge clubId={snapshot.currentClubId} /> : <span className="club-career-status">{t(`playerClubs.status.${verified ? snapshot.careerStatus : 'UNKNOWN'}`)}</span>}
    </span>
    <span className="club-detail-row"><span className="club-detail-label">{t('playerClubs.reference', { year:player.reference_year })}</span><ClubBadge clubId={snapshot.referenceClubId} /></span>
    <span className="club-audit-date">{t('playerClubs.asOf', { date:snapshot.asOfDate })} · {t(verified ? 'playerClubs.verified' : 'playerClubs.pending')}
      {verified && snapshot.sourceUrl && <> · <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" aria-label={t('playerClubs.sourceFor', { player:player.name })}>{t('playerClubs.source')}</a></>}
    </span>
  </span>
}
