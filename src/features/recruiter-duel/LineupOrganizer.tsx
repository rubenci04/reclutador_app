import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { LineupSwapError } from '../tactics/lineupOrdering'
import { ROLE_LINE, type FormationRole } from '../tactics/roles'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { TeamPitchBoard } from './TeamPitchBoard'

interface Props {
  readonly game: RecruiterDuelGame
  readonly participant: RecruiterId
  readonly name: string
  readonly catalog: readonly Player[]
  readonly confirmed: boolean
  /** True once a strategy was confirmed: the eleven can no longer be reopened. */
  readonly locked?: boolean
  readonly onSwap: (first: FormationRole, second: FormationRole) => LineupSwapError | 'invalid_transition' | null
  /** Puts the substitute at that bench place in the eleven, in place of the starter in `slot`. Returns whether it worked. */
  readonly onBenchSwap?: (benchIndex: number, slot: FormationRole) => boolean
  readonly onConfirm: () => void
  readonly onEdit: () => void
}

/** One participant's post-auction ordering step: pick two shirts of the same line to swap them, then confirm. */
export function LineupOrganizer({ game, participant, name, catalog, confirmed, locked = false, onSwap, onBenchSwap, onConfirm, onEdit }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<FormationRole | null>(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [benchTarget, setBenchTarget] = useState<Record<number, string>>({})
  const bench = (game.teams[participant].bench ?? []).flatMap((place, index) => place.playerId ? [{ index, place, player: catalog.find((candidate) => candidate.id === place.playerId) }] : [])
  const playerName = (slot: FormationRole) => catalog.find((player) => player.id === game.teams[participant].lineup[slot])?.name ?? ''
  const drop = (from: FormationRole, to: FormationRole) => {
    if (confirmed || from === to) return
    const first = playerName(from); const second = playerName(to)
    const error = onSwap(from, to)
    setSelected(null)
    setMessage(error ? { kind: 'error', text: t(`lineup.errors.${error}`) } : { kind: 'info', text: t('lineup.swapped', { first, second }) })
  }
  const pick = (slot: FormationRole) => {
    if (confirmed) return
    if (!selected) {
      setSelected(slot)
      return setMessage({ kind: 'info', text: t('lineup.selectedStatus', { player: playerName(slot), line: t(`positions.${ROLE_LINE[slot]}`) }) })
    }
    if (selected === slot) { setSelected(null); return setMessage(null) }
    const first = playerName(selected); const second = playerName(slot)
    const error = onSwap(selected, slot)
    if (error) return setMessage({ kind: 'error', text: t(`lineup.errors.${error}`) })
    setSelected(null); setMessage({ kind: 'info', text: t('lineup.swapped', { first, second }) })
  }
  return <section className="lineup-organizer" aria-labelledby={`lineup-title-${participant}`}>
    <h2 id={`lineup-title-${participant}`}>{t('lineup.turn', { participant: name })}</h2>
    <p>{t(editing ? 'lineup.instructions' : 'lineup.reviewHint')}</p>
    {!confirmed && <button className={editing ? 'primary-action' : 'secondary-action'} aria-pressed={editing} onClick={() => { setEditing(!editing); setSelected(null); setMessage(null) }}>{t(editing ? 'lineup.editModeOn' : 'lineup.editMode')}</button>}
    {editing && !confirmed && <>
      {selected && <p className="lineup-selected" role="status">{t('lineup.selectedBanner', { player: playerName(selected), role: t(`lineup.roles.${selected}`) })}</p>}
      <p className="lineup-legend">{t('lineup.dragHint')} <span><i className="apt apt-NATURAL" />{t('lineup.legend.NATURAL')}</span> <span><i className="apt apt-ADAPTED" />{t('lineup.legend.ADAPTED')}</span> <span><i className="apt apt-UNKNOWN" />{t('lineup.legend.UNKNOWN')}</span></p>
    </>}
    {!confirmed && onBenchSwap && bench.length > 0 && <div className="bench-swap" role="group" aria-label={t('lineup.benchSwap.title')}>
      <h3>{t('lineup.benchSwap.title')}</h3><p>{t('lineup.benchSwap.hint')}</p>
      {bench.map(({ index, place, player }) => {
        const options = DRAFT_SLOTS.filter((slot) => slot.position === place.position)
        const target = benchTarget[index] ?? options[0]?.id
        return <div key={index} className="bench-swap-row"><strong>{player?.name}</strong>
          <label>{t('lineup.benchSwap.replace')}<select value={target} onChange={(event) => setBenchTarget({ ...benchTarget, [index]: event.target.value })}>{options.map((slot) => <option key={slot.id} value={slot.id}>{t(`lineup.roles.${slot.id}`)} · {catalog.find((candidate) => candidate.id === game.teams[participant].lineup[slot.id])?.name}</option>)}</select></label>
          <button className="secondary-action" onClick={() => { const slot = target as FormationRole; const out = playerName(slot); if (onBenchSwap(index, slot)) setMessage({ kind: 'info', text: t('lineup.benchSwap.done', { incoming: player?.name, outgoing: out }) }) }}>{t('lineup.benchSwap.action')}</button></div>
      })}
    </div>}
    <TeamPitchBoard game={game} participant={participant} catalog={catalog} organize={editing && !confirmed ? { selectedSlot: selected, onPick: pick, onDrop: drop } : undefined} />
    <p role={message?.kind === 'error' ? 'alert' : 'status'} className={message?.kind === 'error' ? 'draft-alert' : undefined}>{message?.text}</p>
    {confirmed
      ? <div className="duel-actions"><strong role="status">{t('lineup.confirmed')}</strong>{!locked && <button className="secondary-action" onClick={() => { setSelected(null); setMessage(null); onEdit() }}>{t('lineup.edit')}</button>}</div>
      : <div className="duel-actions"><button className="primary-action" onClick={() => { setSelected(null); setMessage(null); setEditing(false); onConfirm() }}>{t('lineup.confirm')}</button></div>}
  </section>
}
