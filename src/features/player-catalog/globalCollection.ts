import { DRAFT_CATALOG } from '../draft/catalog'
import { ELIGIBLE_LEAGUE_PLAYERS, isEligibleEdition, LEAGUE_PLAYERS } from './leagueCollections'
import { collectionPersonKey, distinctCollection } from './collectionIdentity'
import worldPolicy from '../../data/league-collections/worldLegendPolicy.json'
import type { Player } from '../../types/player'
import { capturePlayerClubs } from './playerClubs'

export const personKey = collectionPersonKey
// Explicit historical edition; active career status and edition category are independent.
const neuer = DRAFT_CATALOG.find((p) => p.name === 'Manuel Neuer')!
export const NEUER_LEGEND: Player = { ...neuer, id: 'edition_neuer_legend', category: 'legend', reference_year: 2014, era: '2010s' }
/** Master editions stay available to saved games even when new category rules exclude them. */
export const MASTER_CATALOG: readonly Player[] = [...DRAFT_CATALOG, ...LEAGUE_PLAYERS, NEUER_LEGEND]
const retired = new Set(DRAFT_CATALOG.filter((p) => capturePlayerClubs(p).careerStatus === 'RETIRED').map(personKey))
/** Highest supplied current OVR, stable id tie-break. No source edition is modified. */
export const ALL_CURRENT = distinctCollection(MASTER_CATALOG.filter((p) => p.category === 'contemporary' && isEligibleEdition(p.id) && !retired.has(personKey(p))).sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id)))
/** Local/league legends remain eligible regionally, independently of WORLD nominations. */
export const ALL_LEGENDS = distinctCollection([...ELIGIBLE_LEAGUE_PLAYERS.filter((p) => p.category === 'legend'), NEUER_LEGEND])
export const WORLD_LEGEND_POLICY = worldPolicy
const source = new Map(MASTER_CATALOG.map((p) => [p.id, p]))
export const ALL_GLOBAL_LEGENDS = distinctCollection(worldPolicy.approved.map((entry) => {
  const p = source.get(entry.editionId)
  if (!p || p.category !== 'legend') throw Error(`invalid_world_legend_edition:${entry.editionId}`)
  return p
}))
/** Compatibility export: stable ordering only; pools grow without an artificial cap. */
export function capCollection(players: readonly Player[]): readonly Player[] {
  return [...players].sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id))
}
export const GLOBAL_CURRENT = capCollection(ALL_CURRENT)
export const GLOBAL_LEGENDS = capCollection(ALL_GLOBAL_LEGENDS)
