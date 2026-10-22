import southAmericaResolution from '../../data/league-collections/southAmericaLegendsResolution.json'
import europeResolution from '../../data/league-collections/europeLegendsResolution.json'
import { ALL_CURRENT, MASTER_CATALOG, personKey } from './globalCollection'
import { BALANCED_LEGEND_EDITIONS, LEAGUE_PROVENANCE, WORLD_EDITION_PREFIX } from './leagueCollections'
import { buildTopPool, type TopResolutionRow } from './topPool'
import { normalizePlayerName } from './playerIdentity'
import { SOUTH_AMERICA_MEXICO_NATIONALITIES } from './southAmericaTop150'
import { EUROPEAN_NATIONALITIES } from '../themed-modes/nationalityRegions'
import type { Player } from '../../types/player'

export const LEGENDS_TOP_SIZE = 150
export const SOUTH_AMERICA_LEGENDS_VERSION: string = southAmericaResolution.version
export const EUROPE_LEGENDS_VERSION: string = europeResolution.version
export const SOUTH_AMERICA_LEGENDS_RESOLUTION = southAmericaResolution.rows as readonly TopResolutionRow[]
export const EUROPE_LEGENDS_RESOLUTION = europeResolution.rows as readonly TopResolutionRow[]

const fullNames = new Map(LEAGUE_PROVENANCE.map((row) => [row.id, row.fullName]))
const byId = new Map(MASTER_CATALOG.map((player) => [player.id, BALANCED_LEGEND_EDITIONS.get(player.id) ?? player]))
/** The same person can have several league editions with different identity keys; the filler keeps the best one only. */
const personName = (player: Player) => `${normalizePlayerName(fullNames.get(player.id) ?? player.name)}:${player.nationality}`
/** Provisional filler: the best existing historical editions of the region. People who also have an active-player edition are not legends, not legends, so they are never used as filler. */
const activeKeys = new Set(ALL_CURRENT.map(personKey))
const shortName = (player: Player) => `${normalizePlayerName(player.name)}:${player.nationality}`
function fillerFor(nationalities: ReadonlySet<string>, rows: readonly TopResolutionRow[]): readonly Player[] {
  const seen = new Set(rows.flatMap((row) => { const player = row.editionId ? byId.get(row.editionId) : undefined; return player ? [personName(player), shortName(player)] : [] }))
  return MASTER_CATALOG.filter((player) => player.category === 'legend' && !player.id.startsWith(WORLD_EDITION_PREFIX) && nationalities.has(player.nationality) && !activeKeys.has(personKey(player))).map((player) => byId.get(player.id)!)
    .sort((a, b) => b.overall_rating - a.overall_rating || a.id.localeCompare(b.id))
    .filter((player) => { const keys = [personName(player), shortName(player)]; if (keys.some((key) => seen.has(key))) return false; keys.forEach((key) => seen.add(key)); return true })
}
/** Local legend-balance-v1 editions are used where they exist; world editions (Pele, Maradona...) are never touched. */
const south = buildTopPool(SOUTH_AMERICA_LEGENDS_RESOLUTION, byId, fillerFor(SOUTH_AMERICA_MEXICO_NATIONALITIES, SOUTH_AMERICA_LEGENDS_RESOLUTION), LEGENDS_TOP_SIZE)
const europe = buildTopPool(EUROPE_LEGENDS_RESOLUTION, byId, fillerFor(EUROPEAN_NATIONALITIES, EUROPE_LEGENDS_RESOLUTION), LEGENDS_TOP_SIZE)
export const SOUTH_AMERICA_LEGENDS_POOL = south.pool
export const SOUTH_AMERICA_LEGENDS_REPORT = south.report
export const EUROPE_LEGENDS_POOL = europe.pool
export const EUROPE_LEGENDS_REPORT = europe.report
