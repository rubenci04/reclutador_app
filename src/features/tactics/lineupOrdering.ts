import type { DraftLineup } from '../draft/draftTypes'
import { FORMATION_ROLES, ROLE_LINE, type FormationRole } from './roles'

export type LineupSwapError = 'unknown_slot' | 'same_slot' | 'different_line' | 'empty_slot'
export type LineupSwap =
  | { readonly ok: true; readonly lineup: DraftLineup }
  | { readonly ok: false; readonly error: LineupSwapError }

/** Swaps two players inside one line. Ownership, budget and prices are untouched; the input is never mutated. */
export function swapWithinLine(lineup: DraftLineup, slotA: FormationRole, slotB: FormationRole): LineupSwap {
  if (!FORMATION_ROLES.includes(slotA) || !FORMATION_ROLES.includes(slotB)) return { ok: false, error: 'unknown_slot' }
  if (slotA === slotB) return { ok: false, error: 'same_slot' }
  if (ROLE_LINE[slotA] !== ROLE_LINE[slotB]) return { ok: false, error: 'different_line' }
  if (!lineup[slotA] || !lineup[slotB]) return { ok: false, error: 'empty_slot' }
  return { ok: true, lineup: { ...lineup, [slotA]: lineup[slotB], [slotB]: lineup[slotA] } }
}
