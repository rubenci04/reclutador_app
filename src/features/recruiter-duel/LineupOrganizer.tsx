import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { LineupSwapError } from '../tactics/lineupOrdering'
import { ROLE_LINE, type FormationRole } from '../tactics/roles'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
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
  readonly onConfirm: () => void
  readonly onEdit: () => void
}

/** One participant's post-auction ordering step: pick two shirts of the same line to swap them, then confirm. */
export function LineupOrganizer({ game, participant, name, catalog, confirmed, locked = false, onSwap, onConfirm, onEdit }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<FormationRole | null>(null)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
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
    <TeamPitchBoard game={game} participant={participant} catalog={catalog} organize={editing && !confirmed ? { selectedSlot: selected, onPick: pick, onDrop: drop } : undefined} />
    <p role={message?.kind === 'error' ? 'alert' : 'status'} className={message?.kind === 'error' ? 'draft-alert' : undefined}>{message?.text}</p>
    {confirmed
      ? <div className="duel-actions"><strong role="status">{t('lineup.confirmed')}</strong>{!locked && <button className="secondary-action" onClick={() => { setSelected(null); setMessage(null); onEdit() }}>{t('lineup.edit')}</button>}</div>
      : <div className="duel-actions"><button className="primary-action" onClick={() => { setSelected(null); setMessage(null); setEditing(false); onConfirm() }}>{t('lineup.confirm')}</button></div>}
  </section>
}
