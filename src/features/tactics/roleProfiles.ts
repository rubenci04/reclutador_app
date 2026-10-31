import type { DraftLineup } from '../draft/draftTypes'
import { FORMATION_ROLES, ROLE_LINE, type FormationRole, type RoleAptitude } from './roles'
import type { Player } from '../../types/player'
import { formationSlots, type FormationId } from './formations'
import { specificRoleCodes } from '../player-catalog/playerDetails'
import { dominantFoot } from '../player-catalog/dominantFoot'

/**
 * Verified role documentation per player id. It stays EMPTY until a role is backed by a recorded source
 * (see docs/CURRENT_CLUB_AUDIT.md): nothing here is inferred from the generic ARQ/DEF/MED/DEL position.
 */
export interface RoleProfile {
  readonly natural: readonly FormationRole[]
  readonly alternative: readonly FormationRole[]
  readonly source: string
  readonly verifiedAt: string
}
export type RoleProfiles = Readonly<Record<string, RoleProfile>>

export const ROLE_PROFILES: RoleProfiles = {}

/** NATURAL / ADAPTED only from verified data; anything undocumented is UNKNOWN, with no penalty or bonus. */
export function roleAptitude(playerId: string | null, role: FormationRole, profiles: RoleProfiles = ROLE_PROFILES): RoleAptitude {
  const profile = playerId ? profiles[playerId] : undefined
  if (!profile) return 'UNKNOWN'
  if (profile.natural.includes(role)) return 'NATURAL'
  return profile.alternative.includes(role) ? 'ADAPTED' : 'UNKNOWN'
}

const LEFT_ROLES = new Set(['LB', 'LI', 'LWB', 'CAI', 'LM', 'MI', 'LW', 'EI'])
const RIGHT_ROLES = new Set(['RB', 'LD', 'CAD', 'RM', 'MD', 'RW', 'ED'])
const CENTRAL_DEFENSIVE_ROLES = new Set(['CB', 'DFC', 'CDM', 'MCD'])

/**
 * TECH-006: suggested aptitude for one slot, from the player's own data (documented specific roles, dominant foot and ratings) and the
 * slot's place on the pitch. It is a suggestion, not verified role documentation, and never changes the match engine.
 * A player outside the slot's line, or without enough data, is UNKNOWN.
 */
export function evaluateSlotAptitude(player: Player, slotId: FormationRole, formation: FormationId = '4-3-3'): RoleAptitude {
  const slot = formationSlots(formation).find((candidate) => candidate.id === slotId)
  if (!slot || player.position !== slot.position) return 'UNKNOWN'
  if (slot.position === 'ARQ') return 'NATURAL'
  const roles = specificRoleCodes(player); const foot = dominantFoot(player)
  const wideAdapted = (player.att_rating + player.phy_rating) / 2 >= 75 ? 'ADAPTED' : 'UNKNOWN'
  if (slot.x <= 32) return foot === 'LEFT' || foot === 'BOTH' || roles.some((role) => LEFT_ROLES.has(role)) ? 'NATURAL' : wideAdapted
  if (slot.x >= 68) return foot === 'RIGHT' || foot === 'BOTH' || roles.some((role) => RIGHT_ROLES.has(role)) ? 'NATURAL' : wideAdapted
  if (slotId === 'LCB' || slotId === 'RCB' || slotId === 'CDM') {
    if (roles.some((role) => CENTRAL_DEFENSIVE_ROLES.has(role)) || player.def_rating >= 80 && player.phy_rating >= 70) return 'NATURAL'
    return player.def_rating * .6 + player.phy_rating * .4 >= 70 ? 'ADAPTED' : 'UNKNOWN'
  }
  return 'UNKNOWN'
}

/**
 * Initial placement suggestion inside each line: verified natural roles first, then verified alternatives, then the
 * original order. Only moves players within their own line. With no verified data it returns the lineup unchanged.
 */
export function suggestLineup(lineup: DraftLineup, profiles: RoleProfiles = ROLE_PROFILES): DraftLineup {
  const result: Record<string, string | null> = { ...lineup }
  for (const line of ['ARQ', 'DEF', 'MED', 'DEL'] as const) {
    const slots = FORMATION_ROLES.filter((role) => ROLE_LINE[role] === line)
    const players = slots.map((slot) => lineup[slot]).filter((id): id is string => id !== null)
    if (players.length !== slots.length) continue
    const assigned = new Map<FormationRole, string>(); const used = new Set<string>()
    for (const wanted of ['NATURAL', 'ADAPTED'] as const) {
      for (const slot of slots) {
        if (assigned.has(slot)) continue
        const candidate = players.find((id) => !used.has(id) && roleAptitude(id, slot, profiles) === wanted)
        if (candidate) { assigned.set(slot, candidate); used.add(candidate) }
      }
    }
    // Anyone left keeps their own slot when it is still free, otherwise fills the remaining slots in order.
    for (const slot of slots) {
      const own = lineup[slot]
      if (!assigned.has(slot) && own && !used.has(own)) { assigned.set(slot, own); used.add(own) }
    }
    const rest = players.filter((id) => !used.has(id))
    for (const slot of slots) if (!assigned.has(slot)) assigned.set(slot, rest.shift()!)
    for (const slot of slots) result[slot] = assigned.get(slot)!
  }
  return result as DraftLineup
}
