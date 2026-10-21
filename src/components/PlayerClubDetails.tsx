import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../types/player'
import { capturePlayerClubs, CLUB_AUDIT_AS_OF } from '../features/player-catalog/playerClubs'
import { ClubBadge } from './ClubBadge'
import { importedClub } from '../features/player-catalog/leagueCollections'
import { importedDetails, playerCareerReferences } from '../features/player-catalog/playerDetails'

/** The date is explicit: future audit files cannot turn a historical card into a current one. */
export function PlayerClubDetails({ player, asOfDate = CLUB_AUDIT_AS_OF }: { readonly player: Player; readonly asOfDate?: string }) {
  const { t } = useTranslation()
  const snapshot = useMemo(() => capturePlayerClubs(player.id === 'edition_neuer_legend' ? { ...player, id: 'plr_001' } : player, asOfDate), [player, asOfDate])
  const verified = snapshot.verificationStatus === 'VERIFIED'
  const suppliedClub = importedClub(player.id)
  const details = importedDetails(player.id)
  const periods = playerCareerReferences(player)
  if (suppliedClub && details) {
    const status = /^retirado(?:\s*\(Leyenda\))?$/i.test(details.sourceStatus) ? 'RETIRED' : /^(activo|ativo|active)/i.test(details.sourceStatus) || /Messi|Cristiano/.test(player.name) ? 'ACTIVE' : 'UNKNOWN'
    const editorialPeriod = details.sourceClubPeriod?.replace('-', '–')
    return <span className="player-club-details player-reference">
      <span className="club-detail-label">{t('collections.referenceLabel')}</span>
      <ClubBadge clubId={player.club_tag} fallbackName={suppliedClub} />
      {editorialPeriod && <span className="club-period">{editorialPeriod}</span>}
      <span>{status !== 'UNKNOWN' && <>{t(`playerClubs.status.${status}`)} · </>}{t('playtest.edition', { edition: t(`catalog.categories.${player.category}`) })}</span>
      <small>{t('collections.editorial')}</small>
      {details.sourceUrl && <a href={details.sourceUrl} target="_blank" rel="noreferrer">{t('playerClubs.source')}</a>}
      {periods.map((period) => <a key={`${period.club}-${period.from}-${period.to}`} href={period.url} target="_blank" rel="noreferrer">{period.club} · {period.from}–{period.to ?? t('playtest.present')}</a>)}
      {player.category === 'legend' && !editorialPeriod && !periods.length && <small>{t('playtest.periodUnknown')}</small>}
    </span>
  }

  return <span className="player-club-details">
    <span className="club-detail-row"><span className="club-detail-label">{t('playerClubs.current')}</span>
      {verified && snapshot.careerStatus === 'ACTIVE' && snapshot.currentClubId ? <ClubBadge clubId={snapshot.currentClubId} /> : <span className="club-career-status">{t(`playerClubs.status.${verified ? snapshot.careerStatus : 'UNKNOWN'}`)}</span>}
    </span>
    <span className="club-detail-row"><span className="club-detail-label">{t('playerClubs.reference', { year:player.reference_year })}</span><ClubBadge clubId={snapshot.referenceClubId} /></span>
    <span className="club-audit-date">{t('playerClubs.asOf', { date:snapshot.asOfDate })} · {t(verified ? 'playerClubs.verified' : 'playerClubs.pending')}
      {verified && snapshot.sourceUrl && <> · <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" aria-label={t('playerClubs.sourceFor', { player:player.name })}>{t('playerClubs.source')}</a></>}
    </span>
    {periods.map((period) => <a key={`${period.club}-${period.from}-${period.to}`} href={period.url} target="_blank" rel="noreferrer">{period.club} · {period.from}–{period.to ?? t('playtest.present')}</a>)}
    {player.category === 'legend' && !periods.length && <small>{t('playtest.periodUnknown')}</small>}
  </span>
}
