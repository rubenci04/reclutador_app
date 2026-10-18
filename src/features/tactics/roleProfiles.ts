import type { DraftLineup } from '../draft/draftTypes'
import { FORMATION_ROLES, ROLE_LINE, type FormationRole, type RoleAptitude } from './roles'

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
