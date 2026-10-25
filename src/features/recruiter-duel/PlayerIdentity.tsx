import coachPhotos from '../../data/coach-photos.json'
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { SHOW_PLAYER_PHOTOS } from '../../config/product'
import { approvedPhoto, flagUrl, PHOTO_MANIFEST } from './visualAssets'
import { PlayerClubDetails } from '../../components/PlayerClubDetails'
import { importedClub } from '../player-catalog/leagueCollections'
import { getClubIdentity } from '../player-catalog/clubRegistry'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { dominantFoot } from '../player-catalog/dominantFoot'
import { specificRoleCodes } from '../player-catalog/playerDetails'
import { nationalityName } from '../player-catalog/nationalityName'
import { FootIcon } from '../../components/FootIcon'
import { RankChip } from '../../components/RankChip'
import type { RankBadge } from '../player-catalog/categoryRanking'

export function PlayerIdentity({ player, rank }: { readonly player:Player; /** Position in the category being played; absent for historical games. */ readonly rank?: RankBadge | null }) {
  const { t, i18n } = useTranslation()
  const [failed,setFailed] = useState(false)
  const [flagFailed,setFlagFailed] = useState(false)
  const photo = approvedPhoto(player.id); const flag = flagUrl(player.nationality)
  const tier = getPlayerTier(player.overall_rating)
  const foot = dominantFoot(player)
  const country = nationalityName(player.nationality, i18n.language, (code) => t(`collections.nationalities.${code}`))
  const roles = specificRoleCodes(player)
  const club = importedClub(player.id) ?? getClubIdentity(player.club_tag)?.name
  const tierClass = player.overall_rating >= 98 ? 'tier-card-s-plus' : `tier-card-${tier.toLowerCase()}`
  return <div className={`single-player-card ${tierClass} pos-${player.position}`}><div className="player-avatar">
    {photo && !failed ? <img src={photo.path} alt={t('cpu.photoAlt',{player:player.name})} onError={() => setFailed(true)} /> : <PlayerAvatar player={player} />}
    <b>{player.overall_rating}</b></div><article><small>{t('duel.playerDrawn')}</small><RankChip rank={rank} /><h2>{player.name}</h2>
    <p className="player-line">{flag && !flagFailed ? <img className="nationality-flag" src={flag} alt={t('cpu.flagAlt',{code:player.nationality})} onError={() => setFlagFailed(true)} /> : <span aria-label={t('cpu.flagMissing')}>◇</span>} {country} · <span className="pos-pill">{t(`positions.${player.position}`)}</span>{club && <span className="player-club"> · {club}</span>}</p>
    <b className="base-price-chip">{t('duel.basePrice',{amount:player.price})}</b>
    <details className="player-full-card"><summary>{t('playerCard.full')}</summary>
    <ul className="player-ratings" aria-label={t('ratings.label', { rating: player.overall_rating })}>{([['att', player.att_rating], ['def', player.def_rating], ['phy', player.phy_rating], ['men', player.men_rating]] as const).map(([key, value]) => <li key={key} className={value >= 90 ? 'top-rating' : value >= 85 ? 'high-rating' : undefined}><b>{value}</b><small>{t(`ratings.${key}`)}</small><i className="rating-bar" aria-hidden="true" style={{ '--rating': `${Math.min(99, value)}%` } as CSSProperties} /></li>)}</ul>
    <p><span className="tier-badge">{t('duel.tier',{tier})}</span> · <span className="preferred-foot" aria-label={t('foot.label', { foot: t(`foot.${foot}`) })}><FootIcon foot={foot} decorative />{t(`foot.${foot}`)}</span></p>
    {roles.length > 0 && <p>{t('playtest.specificPosition', { role: roles.map((code) => t(`playtest.roles.${code}`)).join(' / ') })}</p>}
    <PlayerClubDetails player={player} /></details></article></div>
}

export function VisualCredits() {
  const { t } = useTranslation()
  if (!SHOW_PLAYER_PHOTOS) return null
  return <details className="visual-credits"><summary>{t('cpu.credits')}</summary><p>{t('cpu.photoNotice')}</p>{PHOTO_MANIFEST.map((photo) => <p key={photo.playerId}><a href={photo.sourceUrl}>{photo.attribution}</a> · <a href={photo.licenseUrl}>{photo.license}</a></p>)}{coachPhotos.map((photo) => <p key={photo.coachId}><a href={photo.sourceUrl}>{photo.name} — {photo.author}</a> · <a href={photo.licenseUrl}>{photo.license}</a> · {t('playtest.photoCredit')}</p>)}<p><a href="https://github.com/lipis/flag-icons/blob/v7.5.0/LICENSE">flag-icons 7.5.0 — Panayiotis Lipiridis — MIT</a></p></details>
}
