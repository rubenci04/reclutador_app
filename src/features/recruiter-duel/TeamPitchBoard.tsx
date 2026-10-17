import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { PlayerIdentity } from './PlayerIdentity'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

interface Props { readonly game: RecruiterDuelGame; readonly participant: RecruiterId; readonly catalog: readonly Player[] }

/** Layout coordinates are visual only; slot IDs do not assert sporting subroles. */
export function TeamPitchBoard({ game, participant, catalog }: Props) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const selected = catalog.find((player) => player.id === selectedId)
  const team = game.teams[participant]
  return <>
    <div className="team-pitch" role="group" aria-label={t('pitch.label')}>
      <div className="pitch-markings" aria-hidden="true"><i /><i /><i /></div>
      {DRAFT_SLOTS.map((slot) => {
        const player = catalog.find((candidate) => candidate.id === team.lineup[slot.id])
        const award = game.record.find((entry) => entry.type === 'award' && entry.winner === participant && entry.playerId === player?.id)
        const price = award?.type === 'award' ? award.price : '—'
        const position = t(`positions.${slot.position}`)
        return <div className="pitch-place" key={slot.id} data-slot={slot.id} data-position={slot.position} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
          <button className={`pitch-shirt ${player ? 'occupied' : 'vacant'}`} disabled={!player} aria-label={player ? t('pitch.details', { player: player.name, position, price }) : t('pitch.vacant', { position })} onClick={() => { if (player) { setSelectedId(player.id); dialog.current?.showModal() } }}>
            <svg viewBox="0 0 64 56" aria-hidden="true"><path d="M19 3 5 12 1 26 13 30 17 22 17 53 47 53 47 22 51 30 63 26 59 12 45 3 39 9 25 9Z" /><path className="shirt-stripe" d="M28 11H36V51H28Z" /></svg>
            <span className="pitch-short-name">{player ? (player.name.length > 18 ? `${player.name[0]}. ${player.name.split(' ').slice(-1)[0]}` : player.name) : position}</span><span>{player ? t('teamProgress.rating', { rating: player.overall_rating }) : t('pitch.open')}</span>{player && <span>{t('teamProgress.paid', { amount: price })}</span>}
          </button>
        </div>
      })}
    </div>
    <dialog className="pitch-player-dialog" ref={dialog} aria-label={selected ? t('pitch.playerDetails', { player: selected.name }) : t('pitch.label')} onClose={() => setSelectedId(null)} onCancel={() => setSelectedId(null)}>
      <button className="secondary-action" onClick={() => dialog.current?.close()}>{t('pitch.close')}</button>
      {selected && <PlayerIdentity key={selected.id} player={selected} />}
    </dialog>
  </>
}
