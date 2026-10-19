import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { type FormationRole, type RoleAptitude } from '../tactics/roles'
import { formationSlots } from '../tactics/formations'
import { roleAptitude } from '../tactics/roleProfiles'
import { PlayerIdentity } from './PlayerIdentity'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { getClubVisual } from '../player-catalog/clubVisuals'

/** Organising mode: shirts select/swap players instead of opening their details. */
export interface OrganizeProps {
  readonly selectedSlot: FormationRole | null
  readonly onPick: (slot: FormationRole) => void
  /** Optional drag-and-drop; two taps remain the primary way. */
  readonly onDrop?: (from: FormationRole, to: FormationRole) => void
}
interface Props { readonly game: RecruiterDuelGame; readonly participant: RecruiterId; readonly catalog: readonly Player[]; readonly organize?: OrganizeProps }

/** Layout coordinates are visual only; slot IDs do not assert sporting subroles. */
export function TeamPitchBoard({ game, participant, catalog, organize }: Props) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const selected = catalog.find((player) => player.id === selectedId)
  const team = game.teams[participant]
  const slots = formationSlots(team.formation)
  return <>
    {team.bench && <h3 className="starters-title">{t('lineup.startersTitle', { count: Object.values(team.lineup).filter(Boolean).length, total: DRAFT_SLOTS.length })}</h3>}
    <div className="team-pitch" role="group" aria-label={team.formation && team.formation !== '4-3-3' ? t('playtest.pitchFormation', { formation: team.formation }) : t('pitch.label')}>
      <div className="pitch-markings" aria-hidden="true"><i /><i /><i /></div>
      {slots.map((slot) => {
        const player = catalog.find((candidate) => candidate.id === team.lineup[slot.id])
        const award = game.record.find((entry) => entry.type === 'award' && entry.winner === participant && entry.playerId === player?.id)
        const price = award?.type === 'award' ? award.price : player?.price ?? '—'
        const aptitude: RoleAptitude = organize ? roleAptitude(player?.id ?? null, slot.id) : 'UNKNOWN'
        const sameLine = organize?.selectedSlot ? slots.find((s) => s.id === organize.selectedSlot)?.position === slot.position : false
        const position = t(`positions.${slot.position}`)
        const role = team.formation && team.formation !== '4-3-3' ? position : t(`lineup.roles.${slot.id}`)
        const colors = player ? getClubVisual(player.club_tag) : null
        return <div className="pitch-place" key={slot.id} data-slot={slot.id} data-position={slot.position} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
          <button className={`pitch-shirt ${player ? 'occupied' : 'vacant'}${player && game.phase === 'ROUND_RESULT' && game.lastAward?.reason === 'voluntary_bid' && game.lastAward.playerId === player.id ? ' just-signed' : ''}${organize && organize.selectedSlot === slot.id ? ' selected' : ''}${organize?.selectedSlot && organize.selectedSlot !== slot.id ? (sameLine ? ' swap-target' : ' swap-dim') : ''}`} data-aptitude={organize ? aptitude : undefined} draggable={organize?.onDrop && player ? true : undefined} onDragStart={(event) => { if (organize?.onDrop) event.dataTransfer.setData('text/plain', slot.id) }} onDragOver={(event) => { if (organize?.onDrop) event.preventDefault() }} onDrop={(event) => { const from = event.dataTransfer.getData('text/plain') as FormationRole; if (organize?.onDrop && from) { event.preventDefault(); organize.onDrop(from, slot.id) } }} disabled={!player} aria-pressed={organize && player ? organize.selectedSlot === slot.id : undefined} aria-label={player ? (organize ? t('lineup.slot', { player: player.name, role, state: t(organize.selectedSlot === slot.id ? 'lineup.stateSelected' : 'lineup.stateIdle') }) + (aptitude === 'UNKNOWN' ? '' : `, ${t(`lineup.aptitude.${aptitude}`)}`) : t('pitch.details', { player: player.name, position, price })) : t('pitch.vacant', { position })} onClick={() => { if (!player) return; if (organize) return organize.onPick(slot.id); setSelectedId(player.id); dialog.current?.showModal() }}>
            <svg viewBox="0 0 64 56" aria-hidden="true"><path style={colors ? { fill: colors.primary } : undefined} d="M19 3 5 12 1 26 13 30 17 22 17 53 47 53 47 22 51 30 63 26 59 12 45 3 39 9 25 9Z" /><path className="shirt-stripe" style={colors ? { fill: colors.secondary } : undefined} d="M28 11H36V51H28Z" /></svg>
            <span className="pitch-short-name">{player ? (player.name.length > 18 ? `${player.name[0]}. ${player.name.split(' ').slice(-1)[0]}` : player.name) : position}</span><span>{player ? t('teamProgress.rating', { rating: player.overall_rating }) : t('pitch.open')}</span>{organize && <span className="pitch-role" aria-hidden="true">{team.formation && team.formation !== '4-3-3' ? position : slot.id}<i className={`apt apt-${aptitude}`} /></span>}{player && <span>{t('teamProgress.paid', { amount: price })}</span>}
          </button>
        </div>
      })}
    </div>
    {team.bench && <section className="team-bench" aria-label={t('lineup.benchTitle', { count: team.bench.filter((slot) => slot.playerId).length, total: team.bench.length })}>
      <h3>{t('lineup.benchTitle', { count: team.bench.filter((slot) => slot.playerId).length, total: team.bench.length })}</h3>
      <div className="bench-row">{team.bench.map((slot, index) => {
        const player = catalog.find((candidate) => candidate.id === slot.playerId)
        const position = t(`positions.${slot.position}`)
        const award = player ? game.record.find((entry) => entry.type === 'award' && entry.winner === participant && entry.playerId === player.id) : undefined
        const price = award?.type === 'award' ? award.price : '—'
        return <button key={index} className={`bench-slot ${player ? 'occupied' : 'vacant'}`} data-bench={index} data-position={slot.position} disabled={!player} aria-label={player ? t('lineup.benchDetails', { player: player.name, position, price }) : t('lineup.benchVacant', { position })} onClick={() => { if (player) { setSelectedId(player.id); dialog.current?.showModal() } }}>
          <b>{player ? player.name : position}</b><span>{player ? t('teamProgress.rating', { rating: player.overall_rating }) : t('pitch.open')}</span>{player && <span>{position} · {t('teamProgress.paid', { amount: price })}</span>}
        </button>
      })}</div>
    </section>}
    <dialog className="pitch-player-dialog" ref={dialog} aria-label={selected ? t('pitch.playerDetails', { player: selected.name }) : t('pitch.label')} onClose={() => setSelectedId(null)} onCancel={() => setSelectedId(null)}>
      <button className="secondary-action" onClick={() => dialog.current?.close()}>{t('pitch.close')}</button>
      {selected && <PlayerIdentity key={selected.id} player={selected} />}
    </dialog>
  </>
}
