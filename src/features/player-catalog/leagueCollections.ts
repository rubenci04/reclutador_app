import rows from '../../data/league-collections/players.json'
import identityAliases from '../../data/league-collections/identityAliases.json'
import type { Player } from '../../types/player'
import type { Position } from '../../types/football'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { playerIdentityKey } from './playerIdentity'

/** Source OVR is editorial input, not an independently verified current-club claim.
 * The existing economy accepts 75–99. Values below 75 retain their source value
 * in the provenance, and enter gameplay at the floor. Sector profiles are game
 * design estimates by position, not researched individual attributes.
 */
export const LEAGUE_PROVENANCE = rows
export const LEAGUE_PLAYERS: readonly Player[] = rows.map((row) => {
  const rating = Math.max(75, Math.min(99, row.sourceRating))
  const position = row.position as Position
  const bounded = (offset: number) => Math.max(40, Math.min(99, rating + offset))
  return {
    id: row.id, name: row.name, position, category: row.category as Player['category'],
    // A technical era bucket for compatibility, NOT a biographical peak-year claim.
    reference_year: row.category === 'contemporary' ? 2026 : 2000,
    era: row.category === 'contemporary' ? '2020s' : '2000s',
    nationality: row.nationality, club_tag: row.club_tag, overall_rating: rating,
    att_rating: bounded(position === 'DEL' ? 3 : position === 'MED' ? 0 : position === 'DEF' ? -18 : -35),
    def_rating: bounded(position === 'ARQ' ? 3 : position === 'DEF' ? 2 : position === 'MED' ? -8 : -25),
    phy_rating: bounded(-3), men_rating: bounded(-1), price: calculatePlayerPrice(rating),
  }
})

const modes: Partial<Record<ThemedModeId, readonly [string, Player['category']]>> = {
  ARGENTINA_CURRENT: ['ARG', 'contemporary'], ARGENTINA_LEGENDS: ['ARG', 'legend'],
  BRAZIL_CURRENT: ['BRA', 'contemporary'], BRAZIL_LEGENDS: ['BRA', 'legend'],
  SPAIN_LEAGUE: ['ESP', 'contemporary'], SPAIN_LEGENDS: ['ESP', 'legend'],
  ENGLAND_LEAGUE: ['ENG', 'contemporary'], ENGLAND_LEGENDS: ['ENG', 'legend'],
}
export const IMPORTED_MODE_IDS = [...Object.keys(modes), 'LEGENDS_ONLY'] as ThemedModeId[]
export const defaultBudgetForMode = (id: ThemedModeId) => id.includes('LEGENDS') || id === 'LEGENDS_ONLY' ? 150 : 100
const normalize = (name: string) => playerIdentityKey(name).replace(/[^a-z0-9]/g, '')
const sourceById = new Map(rows.map((row) => [row.id, row]))
// Explicit reviewed edition aliases only. Never merge by shared surnames or
// fuzzy similarity: Verón, Suárez and Ronaldo each refer to distinct people too.
const editionIdentities = new Map(identityAliases.flatMap((group) => group.map((id) => [id, group[0]] as const)))
const knownNames = new Set<string>()
const knownIdentities = new Set<string>()
const globalLegends = LEAGUE_PLAYERS.filter((p) => p.category === 'legend').filter((player) => {
  const source = sourceById.get(player.id)!
  const full = normalize(source.fullName); const sporting = normalize(player.name)
  const identity = editionIdentities.get(player.id) ?? player.id
  const duplicate = knownIdentities.has(identity) || knownNames.has(full) || knownNames.has(sporting)
  knownNames.add(full); knownNames.add(sporting)
  knownIdentities.add(identity)
  return !duplicate
})
const scopedPlayers = new Map(Object.entries(modes).map(([id, scope]) => [id, LEAGUE_PLAYERS.filter((player) => sourceById.get(player.id)!.league === scope[0] && player.category === scope[1])]))
export function importedPlayersForMode(id: ThemedModeId): readonly Player[] | undefined {
  if (id === 'LEGENDS_ONLY') return globalLegends
  return scopedPlayers.get(id)
}

export function importedClub(playerId: string): string | undefined {
  return sourceById.get(playerId)?.club
}
