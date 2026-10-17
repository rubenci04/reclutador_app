import { useTranslation } from 'react-i18next'
import { DRAFT_SLOTS, type DraftLineup, type DraftSlotId } from './draftTypes'
import { DRAFT_CATALOG } from './catalog'

interface DraftPitchProps {
  readonly lineup: DraftLineup
  readonly onChoose: (slot: DraftSlotId) => void
  readonly onRemove: (slot: DraftSlotId) => void
}

const players = new Map(DRAFT_CATALOG.map((player) => [player.id, player]))

export function DraftPitch({ lineup, onChoose, onRemove }: DraftPitchProps) {
  const { t } = useTranslation()
  return <div className="draft-pitch" aria-label={t('home.pitchLabel')}>
    <div className="pitch-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    {DRAFT_SLOTS.map((slot) => {
      const player = lineup[slot.id] ? players.get(lineup[slot.id]!) : undefined
      return <div className="draft-slot" key={slot.id} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
        <button className={`player-token ${player ? 'is-selected' : ''}`} onClick={() => onChoose(slot.id)} aria-label={player ? `${t('draft.replace')}: ${player.name}` : t('draft.emptySlot', { position: t(`positions.${slot.position}`) })}>
          {player ? <><strong>{player.name}</strong><span>{player.overall_rating} GRL · {player.price}M</span></> : <><b>+</b><span>{slot.id} · {t(`positions.${slot.position}`)}</span></>}
        </button>
        {player && <button className="remove-player" onClick={() => onRemove(slot.id)} aria-label={`${t('draft.remove')} ${player.name}`}>×</button>}
      </div>
    })}
  </div>
}
