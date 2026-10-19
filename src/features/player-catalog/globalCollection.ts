import { DRAFT_CATALOG } from '../draft/catalog'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE, importedPlayersForMode } from './leagueCollections'
import { playerIdentityKey, resolvePlayerIdentity } from './playerIdentity'
import type { Player } from '../../types/player'
import { capturePlayerClubs } from './playerClubs'

const provenance = new Map(LEAGUE_PROVENANCE.map((p) => [p.id, p]))
export function personKey(player: Player): string {
  const name = provenance.get(player.id)?.fullName ?? player.name
  const registered = resolvePlayerIdentity(name) ?? resolvePlayerIdentity(player.name)
  return registered ? `player:${registered}` : playerIdentityKey(name)
}
const seen = new Set<string>()
const retired = new Set(DRAFT_CATALOG.filter((p) => capturePlayerClubs(p).careerStatus === 'RETIRED').map(personKey))
export const ALL_CURRENT: readonly Player[] = [...DRAFT_CATALOG, ...LEAGUE_PLAYERS.filter((p) => p.category === 'contemporary')]
  .filter((p) => !retired.has(personKey(p)))
  .sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id))
  .filter((p) => { const key = personKey(p); if (seen.has(key)) return false; seen.add(key); return true })
export const GLOBAL_CURRENT = ALL_CURRENT.slice(0, 300)
// Explicit historical edition; active career status and edition category are independent.
const neuer = DRAFT_CATALOG.find((p) => p.name === 'Manuel Neuer')!
export const NEUER_LEGEND: Player = { ...neuer, id: 'edition_neuer_legend', category: 'legend', reference_year: 2014, era: '2010s' }
// Global uses Cristiano's supplied Madrid peak (98), while England retains its United edition (97).
const cristianoPeak = LEAGUE_PLAYERS.find((p) => p.id === 'import_esp_esp_leg_cristiano_ronaldo_dos_santos_aveiro')!
export const ALL_GLOBAL_LEGENDS: readonly Player[] = [...importedPlayersForMode('LEGENDS_ONLY')!.map((p) => p.id === 'import_eng_epl_ley_001' ? cristianoPeak : p), NEUER_LEGEND]
export function capCollection(players: readonly Player[], affordableDepth = false): readonly Player[] {
  const sorted = [...players].sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id))
  if (!affordableDepth || sorted.length <= 300) return sorted.slice(0, 300)
  // All-elite historical pools otherwise force the same few cheap cards into every draw.
  return [...sorted.slice(0, 200), ...sorted.slice(200).sort((a, b) => a.price - b.price || b.overall_rating - a.overall_rating || a.id.localeCompare(b.id)).slice(0, 100)]
}
export const GLOBAL_LEGENDS = capCollection(ALL_GLOBAL_LEGENDS, true)
