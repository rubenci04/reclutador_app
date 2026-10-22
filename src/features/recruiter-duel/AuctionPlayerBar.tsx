import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { approvedPhoto } from './visualAssets'
import { PlayerAvatar } from '../../components/PlayerAvatar'
import { FootIcon } from '../../components/FootIcon'
import { dominantFoot } from '../player-catalog/dominantFoot'
import { importedClub } from '../player-catalog/leagueCollections'
import { getClubIdentity } from '../player-catalog/clubRegistry'

/** Compact, recognisable version of the footballer in play; stays next to the bid controls (sticky inside the panel). */
export function AuctionPlayerBar({ player }: { readonly player: Player }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  const photo = approvedPhoto(player.id)
  const club = importedClub(player.id) ?? getClubIdentity(player.club_tag)?.name
  const foot = dominantFoot(player)
  return <div className="auction-player-bar" role="group" aria-label={t('auctionFocus.playerInPlay', { player: player.name })}>
    <span className="bar-avatar">{photo && !failed ? <img src={photo.path} alt="" onError={() => setFailed(true)} /> : <PlayerAvatar player={player} />}<b>{player.overall_rating}</b></span>
    <span className="bar-identity">
      <strong>{player.name}</strong>
      <span><span className="pos-pill">{t(`positions.${player.position}`)}</span>{club && <span className="bar-club"> · {club}</span>}</span>
    </span>
    <span className="bar-meta">
      <b className="base-price-chip">{t('duel.basePrice', { amount: player.price })}</b>
      {foot !== 'UNKNOWN' && <span className="preferred-foot" aria-label={t('foot.label', { foot: t(`foot.${foot}`) })}><FootIcon foot={foot} decorative />{t(`foot.${foot}`)}</span>}
    </span>
  </div>
}
