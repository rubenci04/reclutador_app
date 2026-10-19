import { DRAFT_SLOTS, type DraftLineup, type DraftSlot } from '../draft/draftTypes'
import type { Player } from '../../types/player'
import type { StrategyId } from './strategies'
import type { TacticalAdjustment } from './tacticalModel'

export const FORMATION_IDS = ['4-3-3', '4-4-2', '4-3-1-2', '4-2-3-1', '3-4-3', '5-3-2', '4-2-2-2', '5-4-1', '4-5-1'] as const
export type FormationId = (typeof FORMATION_IDS)[number]
export const isFormationId = (value: unknown): value is FormationId => (FORMATION_IDS as readonly unknown[]).includes(value)
/** Stable eleven storage keys, with position/coordinates determined by formation. */
export function formationSlots(id: FormationId = '4-3-3'): readonly DraftSlot[] {
  if (id === '4-3-3') return DRAFT_SLOTS
  return DRAFT_SLOTS.map((slot) => {
    if (id === '4-2-3-1') {
      if (slot.id === 'LW' || slot.id === 'RW') return { ...slot, y: 32 }
      if (slot.id === 'RCM') return { ...slot, x: 50, y: 32 }
      if (slot.id === 'LCM' || slot.id === 'CDM') return { ...slot, x: slot.id === 'LCM' ? 36 : 64, y: 54 }
      return slot
    }
    if (id === '3-4-3') {
      if (slot.id === 'RCB') return { ...slot, position: 'MED' as const, x: 86, y: 47 }
      if (slot.id === 'LB' || slot.id === 'RB' || slot.id === 'LCB') return { ...slot, x: slot.id === 'LB' ? 26 : slot.id === 'RB' ? 74 : 50, y: 71 }
      if (slot.position === 'MED') return { ...slot, x: slot.id === 'LCM' ? 14 : slot.id === 'CDM' ? 38 : 62, y: 47 }
      return slot
    }
    if (id === '4-5-1') {
      if (slot.id === 'LW' || slot.id === 'RW') return { ...slot, position: 'MED' as const, x: slot.id === 'LW' ? 14 : 86, y: 42 }
      if (slot.position === 'MED') return { ...slot, x: slot.id === 'LCM' ? 32 : slot.id === 'CDM' ? 50 : 68, y: 47 }
      return slot
    }
    if (id === '4-4-2' || id === '4-3-1-2' || id === '4-2-2-2') {
      if (slot.id === 'LW') return { ...slot, position: 'MED' as const, x: id === '4-3-1-2' ? 50 : id === '4-2-2-2' ? 30 : 14, y: id === '4-3-1-2' ? 30 : id === '4-2-2-2' ? 34 : 44 }
      if (slot.id === 'ST') return { ...slot, x: 36, y: 16 }
      if (slot.id === 'RW') return { ...slot, x: 64, y: 16 }
      if (id === '4-2-2-2') {
        if (slot.id === 'LCM' || slot.id === 'CDM') return { ...slot, x: slot.id === 'LCM' ? 36 : 64, y: 56 }
        if (slot.id === 'RCM') return { ...slot, x: 70, y: 34 }
      }
      if (id === '4-4-2' && slot.id === 'RCM') return { ...slot, x: 86, y: 44 }
      if (id === '4-4-2' && slot.id === 'LCM') return { ...slot, x: 38, y: 44 }
      if (id === '4-4-2' && slot.id === 'CDM') return { ...slot, x: 62, y: 44 }
      return slot
    }
    if (slot.id === 'LW') return { ...slot, position: 'DEF' as const, x: 50, y: 70 }
    if (slot.id === 'LCB') return { ...slot, x: 32, y: 68 }
    if (slot.id === 'RCB') return { ...slot, x: 68, y: 68 }
    if (slot.id === 'ST') return { ...slot, x: id === '5-3-2' ? 36 : 50, y: 16 }
    if (slot.id === 'RW') return { ...slot, position: id === '5-4-1' ? 'MED' as const : 'DEL' as const, x: id === '5-3-2' ? 64 : 86, y: id === '5-3-2' ? 16 : 43 }
    if (id === '5-4-1' && slot.id === 'LCM') return { ...slot, x: 14, y: 43 }
    if (id === '5-4-1' && slot.id === 'CDM') return { ...slot, x: 38, y: 43 }
    if (id === '5-4-1' && slot.id === 'RCM') return { ...slot, x: 62, y: 43 }
    return slot
  })
}
export function organizeFormation(ids: readonly string[], formation: FormationId, catalog: readonly Player[]): DraftLineup | null {
  const available = catalog.filter((p) => ids.includes(p.id)).sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id))
  const lineup = {} as DraftLineup; const used = new Set<string>()
  for (const slot of formationSlots(formation)) {
    const player = available.find((p) => p.position === slot.position && !used.has(p.id))
    if (!player) return null
    lineup[slot.id] = player.id; used.add(player.id)
  }
  return lineup
}
export function formationAffinity(formation: FormationId, strategy: StrategyId): TacticalAdjustment {
  const aligned = strategy === 'MIDFIELD_CONTROL' ? formation === '4-3-1-2'
    : strategy === 'WIDE_PLAY' ? formation === '4-2-3-1' || formation === '3-4-3'
      : strategy === 'COUNTER_ATTACK' ? formation === '5-3-2' || formation === '4-4-2'
        : strategy === 'HIGH_PRESS' ? formation === '4-3-3' || formation === '4-2-2-2'
          : strategy === 'LOW_BLOCK' ? formation === '5-4-1' || formation === '4-5-1' : false
  return { attack: aligned && (strategy === 'WIDE_PLAY' || strategy === 'COUNTER_ATTACK' || strategy === 'HIGH_PRESS') ? 1 : 0, defense: aligned && strategy === 'LOW_BLOCK' ? 1.5 : 0, midfield: aligned && strategy === 'MIDFIELD_CONTROL' ? 1.5 : aligned && strategy === 'HIGH_PRESS' ? .5 : 0 }
}
