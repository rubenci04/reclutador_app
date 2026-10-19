import coachPhotos from '../../data/coach-photos.json'
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { approvedPhoto, flagUrl, PHOTO_MANIFEST } from './visualAssets'
import { PlayerClubDetails } from '../../components/PlayerClubDetails'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { preferredFoot } from '../player-catalog/playerAppearance'
import { specificPosition } from '../player-catalog/playerDetails'

export function PlayerIdentity({ player }: { readonly player:Player }) {
  const { t } = useTranslation()
  const [failed,setFailed] = useState(false)
  const [flagFailed,setFlagFailed] = useState(false)
  const photo = approvedPhoto(player.id); const flag = flagUrl(player.nationality)
  const tier = getPlayerTier(player.overall_rating)
  const foot = preferredFoot(player.id)
  const tierClass = player.overall_rating >= 98 ? 'tier-card-s-plus' : `tier-card-${tier.toLowerCase()}`
  return <div className={`single-player-card ${tierClass} pos-${player.position}`}><div className="player-avatar">
    {photo && !failed ? <img src={photo.path} alt={t('cpu.photoAlt',{player:player.name})} onError={() => setFailed(true)} /> : <PlayerAvatar player={player} />}
    <b>{player.overall_rating}</b></div><article><small>{t('duel.playerDrawn')}</small><h2>{player.name}</h2>
    <ul className="player-ratings" aria-label={t('ratings.label', { rating: player.overall_rating })}>{([['att', player.att_rating], ['def', player.def_rating], ['phy', player.phy_rating], ['men', player.men_rating]] as const).map(([key, value]) => <li key={key} className={value >= 90 ? 'top-rating' : value >= 85 ? 'high-rating' : undefined}><b>{value}</b><small>{t(`ratings.${key}`)}</small><i className="rating-bar" aria-hidden="true" style={{ '--rating': `${Math.min(99, value)}%` } as CSSProperties} /></li>)}</ul>
    <p>{flag && !flagFailed ? <img className="nationality-flag" src={flag} alt={t('cpu.flagAlt',{code:player.nationality})} onError={() => setFlagFailed(true)} /> : <span aria-label={t('cpu.flagMissing')}>◇</span>} {player.nationality} · <span className="pos-pill">{t(`positions.${player.position}`)}</span> · <span className="tier-badge">{t('duel.tier',{tier})}</span></p>
    {specificPosition(player) && <p>{t('playtest.specificPosition', { role: t(`playtest.roles.${specificPosition(player)}`) })}</p>}
    {foot && <p className="preferred-foot">{t('foot.label', { foot: t(`foot.${foot}`) })}</p>}
    <PlayerClubDetails player={player} /><b className="base-price-chip">{t('duel.basePrice',{amount:player.price})}</b></article></div>
}

export function VisualCredits() {
  const { t } = useTranslation()
  return <details className="visual-credits"><summary>{t('cpu.credits')}</summary><p>{t('cpu.photoNotice')}</p>{PHOTO_MANIFEST.map((photo) => <p key={photo.playerId}><a href={photo.sourceUrl}>{photo.attribution}</a> · <a href={photo.licenseUrl}>{photo.license}</a></p>)}{coachPhotos.map((photo) => <p key={photo.coachId}><a href={photo.sourceUrl}>{photo.name} — {photo.author}</a> · <a href={photo.licenseUrl}>{photo.license}</a> · {t('playtest.photoCredit')}</p>)}<p><a href="https://github.com/lipis/flag-icons/blob/v7.5.0/LICENSE">flag-icons 7.5.0 — Panayiotis Lipiridis — MIT</a></p></details>
}
