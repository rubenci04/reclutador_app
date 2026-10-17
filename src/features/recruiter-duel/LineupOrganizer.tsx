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
  readonly onSwap: (first: FormationRole, second: FormationRole) => LineupSwapError | 'invalid_transition' | null
  readonly onConfirm: () => void
  readonly onEdit: () => void
}

/** One participant's post-auction ordering step: pick two shirts of the same line to swap them, then confirm. */
export function LineupOrganizer({ game, participant, name, catalog, confirmed, onSwap, onConfirm, onEdit }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<FormationRole | null>(null)
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const playerName = (slot: FormationRole) => catalog.find((player) => player.id === game.teams[participant].lineup[slot])?.name ?? ''
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
    <p>{t('lineup.instructions')}</p>
    <TeamPitchBoard game={game} participant={participant} catalog={catalog} organize={{ selectedSlot: selected, onPick: pick }} />
    <p role={message?.kind === 'error' ? 'alert' : 'status'} className={message?.kind === 'error' ? 'draft-alert' : undefined}>{message?.text}</p>
    {confirmed
      ? <div className="duel-actions"><strong role="status">{t('lineup.confirmed')}</strong><button className="secondary-action" onClick={() => { setSelected(null); setMessage(null); onEdit() }}>{t('lineup.edit')}</button></div>
      : <div className="duel-actions"><button className="primary-action" onClick={() => { setSelected(null); setMessage(null); onConfirm() }}>{t('lineup.confirm')}</button></div>}
  </section>
}
