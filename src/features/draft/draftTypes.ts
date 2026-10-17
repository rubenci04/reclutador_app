import type { Position } from '../../types/football'
import type { Player, PlayerTier } from '../../types/player'

export const DRAFT_SLOT_IDS = ['LW', 'ST', 'RW', 'LCM', 'CM', 'RCM', 'LB', 'LCB', 'RCB', 'RB', 'GK'] as const
export type DraftSlotId = (typeof DRAFT_SLOT_IDS)[number]

export interface DraftSlot {
  readonly id: DraftSlotId
  readonly position: Position
  readonly x: number
  readonly y: number
}

export const DRAFT_SLOTS: readonly DraftSlot[] = [
  { id: 'LW', position: 'DEL', x: 23, y: 18 }, { id: 'ST', position: 'DEL', x: 50, y: 14 }, { id: 'RW', position: 'DEL', x: 77, y: 18 },
  { id: 'LCM', position: 'MED', x: 23, y: 43 }, { id: 'CM', position: 'MED', x: 50, y: 40 }, { id: 'RCM', position: 'MED', x: 77, y: 43 },
  { id: 'LB', position: 'DEF', x: 14, y: 66 }, { id: 'LCB', position: 'DEF', x: 38, y: 70 }, { id: 'RCB', position: 'DEF', x: 62, y: 70 }, { id: 'RB', position: 'DEF', x: 86, y: 66 },
  { id: 'GK', position: 'ARQ', x: 50, y: 88 },
] as const

export type DraftLineup = Record<DraftSlotId, string | null>
export type DraftMessageCode = 'duplicate' | 'wrongPosition' | 'overBudget' | 'impossibleBudget' | 'invalidPlayer' | 'incomplete' | 'invalidDraft'

export interface DraftSummary {
  readonly selectedPlayers: readonly Player[]
  readonly selectedCount: number
  readonly spent: number
  readonly remaining: number
  readonly averageRating: number | null
  readonly tierCounts: Readonly<Record<PlayerTier, number>>
  readonly minimumCompletionCost: number | null
  readonly canCompleteWithinBudget: boolean
  readonly canConfirm: boolean
}
