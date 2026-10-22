import resolution from '../../data/league-collections/southAmericaTop150Resolution.json'
import { ALL_CURRENT, MASTER_CATALOG } from './globalCollection'
import { buildTopPool, type TopResolutionRow } from './topPool'
import type { Player } from '../../types/player'

/** Playable-collection size of Sudamérica + México Actualidad (south-america-mexico-top-150-v1). */
export const SOUTH_AMERICA_TOP_SIZE = 150
export const SOUTH_AMERICA_TOP_VERSION: string = resolution.version
/** The eleven associations of the ranking; Central America and the Caribbean are not included. */
export const SOUTH_AMERICA_MEXICO_NATIONALITIES: ReadonlySet<string> = new Set(['ARG', 'BOL', 'BRA', 'CHI', 'COL', 'ECU', 'PAR', 'PER', 'URU', 'VEN', 'MEX'])
export const SOUTH_AMERICA_TOP_RESOLUTION = resolution.rows as readonly TopResolutionRow[]

const byId = new Map(MASTER_CATALOG.map((player) => [player.id, player]))
/** Provisional filler: best-rated South American / Mexican identities of a 2026 edition that the ranking does not name. Nobody is invented; the shortfall is documented. */
const top = buildTopPool(SOUTH_AMERICA_TOP_RESOLUTION, byId, ALL_CURRENT.filter((player) => SOUTH_AMERICA_MEXICO_NATIONALITIES.has(player.nationality) && player.reference_year === 2026), SOUTH_AMERICA_TOP_SIZE)
export const SOUTH_AMERICA_CURRENT_POOL: readonly Player[] = top.pool
export const SOUTH_AMERICA_TOP_REPORT = top.report
