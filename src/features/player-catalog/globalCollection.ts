import { DRAFT_CATALOG } from '../draft/catalog'
import { ELIGIBLE_LEAGUE_PLAYERS, isEligibleEdition, LEAGUE_PLAYERS, LEAGUE_PROVENANCE, WORLD_EDITIONS, WORLD_EDITION_PREFIX, worldEditionId } from './leagueCollections'
import { collectionPersonKey, distinctCollection } from './collectionIdentity'
import worldPolicy from '../../data/league-collections/worldLegendPolicy.json'
import type { Player } from '../../types/player'
import { capturePlayerClubs } from './playerClubs'

export const personKey = collectionPersonKey
// Explicit historical edition; active career status and edition category are independent.
const neuer = DRAFT_CATALOG.find((p) => p.name === 'Manuel Neuer')!
export const NEUER_LEGEND: Player = { ...neuer, id: 'edition_neuer_legend', category: 'legend', reference_year: 2014, era: '2010s' }
/** World editions keep the source OVR of league legends whose league edition is rebalanced; only the nominated ones are needed. */
const nominated = new Set(worldPolicy.approved.map((entry) => entry.editionId))
export const WORLD_LEGEND_EDITIONS = WORLD_EDITIONS.filter((p) => nominated.has(p.id.slice(WORLD_EDITION_PREFIX.length)))
/** Master editions stay available to saved games even when new category rules exclude them. */
export const MASTER_CATALOG: readonly Player[] = [...DRAFT_CATALOG, ...LEAGUE_PLAYERS, NEUER_LEGEND, ...WORLD_LEGEND_EDITIONS]
const retired = new Set(DRAFT_CATALOG.filter((p) => capturePlayerClubs(p).careerStatus === 'RETIRED').map(personKey))
/** Highest supplied current OVR, stable id tie-break. No source edition is modified. */
export const ALL_CURRENT = distinctCollection(MASTER_CATALOG.filter((p) => p.category === 'contemporary' && isEligibleEdition(p.id) && !retired.has(personKey(p))).sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id)))
/** Local/league legends remain eligible regionally, independently of WORLD nominations. */
export const ALL_LEGENDS = distinctCollection([...ELIGIBLE_LEAGUE_PLAYERS.filter((p) => p.category === 'legend'), NEUER_LEGEND])
export const WORLD_LEGEND_POLICY = worldPolicy
const source = new Map(MASTER_CATALOG.map((p) => [p.id, p]))
export const ALL_GLOBAL_LEGENDS = distinctCollection(worldPolicy.approved.map((entry) => {
  const p = source.get(worldEditionId(entry.editionId)) ?? source.get(entry.editionId)
  if (!p || p.category !== 'legend') throw Error(`invalid_world_legend_edition:${entry.editionId}`)
  return p
}))
/** Compatibility export: stable ordering only; pools grow without an artificial cap. */
export function capCollection(players: readonly Player[]): readonly Player[] {
  return [...players].sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id))
}
/** Playable size of the global categories (global-top-150-v1). The complete master and the archived nominations stay available. */
export const GLOBAL_TOP_SIZE = 150
export const GLOBAL_TOP_VERSION = 'global-top-150-v1'
/** Global Leyendas is the most played nostalgic edition: legends-200-v1 raises it to 200 (the other global category stays at 150). */
export const GLOBAL_LEGENDS_SIZE = 200
export const LEGENDS_SIZE_VERSION = 'legends-200-v1'
/** Every eligible contemporary identity, best first (the pre-RANK-008 pool of 1,039). */
export const GLOBAL_CURRENT_ALL = capCollection(ALL_CURRENT)
/** Global Actual: the best 150 identities by effective OVR; ties prefer a 2026 edition, then id. Positions are checked by the tests (the 22-card auction needs ARQ, DEF, MED and DEL depth). */
const leagueRank = new Map(LEAGUE_PROVENANCE.map((row) => [row.id, row.sourceRank]))
/** Quality order of the global pools: effective OVR, then a 2026 edition, then the best editorial position in the edition's own league (catalogue editions first), then id. */
const byQuality = (a: Player, b: Player) => b.overall_rating - a.overall_rating || b.reference_year - a.reference_year || (leagueRank.get(a.id) ?? 0) - (leagueRank.get(b.id) ?? 0) || a.id.localeCompare(b.id)
export const GLOBAL_CURRENT: readonly Player[] = [...ALL_CURRENT].sort(byQuality).slice(0, GLOBAL_TOP_SIZE)
/** The 177 archived nominations, best first (the pre-RANK-008 pool). */
export const GLOBAL_LEGENDS_ALL = capCollection(ALL_GLOBAL_LEGENDS)
/** Editorial opening of the global legends ranking; OVRs stay the originals, the position is not an official rating. */
const LEGENDS_HEAD = ['Lionel Messi', 'Diego Maradona', 'Pelé']
const legendsHead = LEGENDS_HEAD.map((name) => GLOBAL_LEGENDS_ALL.find((player) => player.name === name)!)
const fullNameOf = new Map(LEAGUE_PROVENANCE.map((row) => [row.id, row.fullName]))
const identity = (player: Player) => `${(fullNameOf.get(player.id.replace(/^world_/, '')) ?? player.name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}:${player.nationality}`
/** Legends of the European leagues are world class by construction (Top 150 of Spain, England and Italy); local Argentine, Brazilian and Mexican heroes stay in their own categories unless nominated. */
const EUROPEAN_LEAGUE_LEGEND = /^import_(esp_esp_leg_|eng_epl_ley_|ita_leg_|eur_leg_)/
const archived = new Set([...GLOBAL_LEGENDS_ALL.map(personKey), ...GLOBAL_LEGENDS_ALL.map(identity)])
const European = ALL_LEGENDS.filter((player) => EUROPEAN_LEAGUE_LEGEND.test(player.id) && !archived.has(personKey(player)) && !archived.has(identity(player)))
/** Candidates of Global Leyendas: the 177 archived nominations plus the world-class European league legends that were never nominated (one edition per person). */
export const GLOBAL_LEGEND_CANDIDATES: readonly Player[] = [...GLOBAL_LEGENDS_ALL, ...European.filter((player, index) => European.findIndex((other) => personKey(other) === personKey(player) || identity(other) === identity(player)) === index)]
/** Global Leyendas: Messi, Maradona and Pelé first, then the best candidates by quality, 150 in total. Everything left out stays in the archive and the master. */
export const GLOBAL_LEGENDS: readonly Player[] = [...legendsHead, ...[...GLOBAL_LEGEND_CANDIDATES].sort(byQuality).filter((player) => !legendsHead.includes(player))].slice(0, GLOBAL_LEGENDS_SIZE)
