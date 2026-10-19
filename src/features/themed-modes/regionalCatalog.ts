import type { Player } from '../../types/player'
import { DRAFT_CATALOG } from '../draft/catalog'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE, importedPlayersForMode } from '../player-catalog/leagueCollections'
import { playerIdentityKey, resolvePlayerIdentity } from '../player-catalog/playerIdentity'
import { EUROPEAN_NATIONALITIES, LATIN_AMERICAN_ASSOCIATIONS } from './nationalityRegions'
import type { ThemedModeId } from './modeTypes'

export const REGIONAL_MODE_IDS: readonly ThemedModeId[] = ['SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS']
const sourceNames = new Map(LEAGUE_PROVENANCE.map((p) => [p.id, p.fullName]))
const seen = new Set<string>()
// Prefer existing current editions, retaining players outside the four leagues
// (e.g. Cristiano Ronaldo). A historical league edition never becomes current.
const current = [...DRAFT_CATALOG, ...LEAGUE_PLAYERS.filter((p) => p.category === 'contemporary')].filter((player) => {
  const fullName = sourceNames.get(player.id) ?? player.name
  const registered = resolvePlayerIdentity(fullName) ?? resolvePlayerIdentity(player.name)
  const key = registered ? `player:${registered}` : playerIdentityKey(fullName)
  const duplicate = seen.has(key)
  seen.add(key)
  return !duplicate
})
const legends = importedPlayersForMode('LEGENDS_ONLY')!
const scoped: Partial<Record<ThemedModeId, readonly Player[]>> = {
  SOUTH_AMERICA_CURRENT: current.filter((p) => LATIN_AMERICAN_ASSOCIATIONS.has(p.nationality)),
  SOUTH_AMERICA_LEGENDS: legends.filter((p) => LATIN_AMERICAN_ASSOCIATIONS.has(p.nationality)),
  EUROPE_CURRENT: current.filter((p) => EUROPEAN_NATIONALITIES.has(p.nationality)),
  EUROPE_LEGENDS: legends.filter((p) => EUROPEAN_NATIONALITIES.has(p.nationality)),
}
export const regionalPlayersForMode = (id: ThemedModeId) => scoped[id]
