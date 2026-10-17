import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { approvedPhoto, flagUrl, PHOTO_MANIFEST } from './visualAssets'
import { PlayerClubDetails } from '../../components/PlayerClubDetails'

export function PlayerIdentity({ player }: { readonly player:Player }) {
  const { t } = useTranslation()
  const [failed,setFailed] = useState(false)
  const [flagFailed,setFlagFailed] = useState(false)
  const photo = approvedPhoto(player.id); const flag = flagUrl(player.nationality)
  return <div className="single-player-card"><div className="player-avatar">
    {photo && !failed ? <img src={photo.path} alt={t('cpu.photoAlt',{player:player.name})} onError={() => setFailed(true)} /> : <span className="avatar-silhouette" role="img" aria-label={t('duel.placeholderAvatar',{player:player.name})}>●<br />▰</span>}
    <b>{player.overall_rating}</b></div><article><small>{t('duel.playerDrawn')}</small><h2>{player.name}</h2>
    <p>{flag && !flagFailed ? <img className="nationality-flag" src={flag} alt={t('cpu.flagAlt',{code:player.nationality})} onError={() => setFlagFailed(true)} /> : <span aria-label={t('cpu.flagMissing')}>◇</span>} {player.nationality} · {t(`positions.${player.position}`)} · {t('duel.tier',{tier:getPlayerTier(player.overall_rating)})}</p>
    <PlayerClubDetails player={player} /><b>{t('duel.basePrice',{amount:player.price})}</b></article></div>
}

export function VisualCredits() {
  const { t } = useTranslation()
  return <details className="visual-credits"><summary>{t('cpu.credits')}</summary><p>{t('cpu.photoNotice')}</p>{PHOTO_MANIFEST.map((photo) => <p key={photo.playerId}><a href={photo.sourceUrl}>{photo.attribution}</a> · <a href={photo.licenseUrl}>{photo.license}</a></p>)}<p><a href="https://github.com/lipis/flag-icons/blob/v7.5.0/LICENSE">flag-icons 7.5.0 — Panayiotis Lipiridis — MIT</a></p></details>
}
