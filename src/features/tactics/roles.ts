import type { Position } from '../../types/football'
import { DRAFT_SLOT_IDS, type DraftLineup, type DraftSlotId } from '../draft/draftTypes'

/** The eleven 4-3-3 roles. They share identifiers with the pitch slots so lineups stay one structure. */
export type FormationRole = DraftSlotId
export const FORMATION_ROLES: readonly FormationRole[] = DRAFT_SLOT_IDS

/** Internal line codes (ARQ | DEF | MED | DEL) are never translated; only role labels are. */
export const ROLE_LINE: Readonly<Record<FormationRole, Position>> = {
  GK: 'ARQ', LB: 'DEF', LCB: 'DEF', RCB: 'DEF', RB: 'DEF',
  CDM: 'MED', LCM: 'MED', RCM: 'MED', LW: 'DEL', ST: 'DEL', RW: 'DEL',
}

/** Future per-role suitability. No catalog data populates it yet: absent evidence means UNKNOWN, never a bonus or penalty. */
export type RoleAptitude = 'NATURAL' | 'ADAPTED' | 'UNKNOWN'

/** Earlier builds named the central midfield slot 'CM'; persisted lineups are renamed when read. */
export function migrateLegacyLineupKeys(raw: Record<string, unknown>): Record<string, unknown> {
  if (!('CM' in raw) || 'CDM' in raw) return raw
  const { CM, ...rest } = raw
  return { ...rest, CDM: CM }
}

export const isLineComplete = (lineup: DraftLineup) => FORMATION_ROLES.every((role) => lineup[role] !== null)
