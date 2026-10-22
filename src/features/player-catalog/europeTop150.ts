import resolution from '../../data/league-collections/europeTop150Resolution.json'
import { ALL_CURRENT } from './globalCollection'
import { buildTopPool, type TopResolutionRow } from './topPool'
import { EUROPEAN_NATIONALITIES } from '../themed-modes/nationalityRegions'
import type { Player } from '../../types/player'

/** Playable-collection size of Europe Actualidad (europe-top-150-v1). */
export const EUROPE_TOP_SIZE = 150
export const EUROPE_TOP_VERSION: string = resolution.version
export type EuropeRowStatus = TopResolutionRow['status']
export const EUROPE_TOP_RESOLUTION = resolution.rows as readonly TopResolutionRow[]

const byId = new Map(ALL_CURRENT.map((player) => [player.id, player]))
/** Provisional filler: best-rated European identities of a 2026 edition (older reference editions of former stars are not 2026 candidates) that the ranking does not name. Nobody is invented; the shortfall is documented. */
const top = buildTopPool(EUROPE_TOP_RESOLUTION, byId, ALL_CURRENT.filter((player) => EUROPEAN_NATIONALITIES.has(player.nationality) && player.reference_year === 2026), EUROPE_TOP_SIZE)
export const EUROPE_CURRENT_POOL: readonly Player[] = top.pool
export const EUROPE_TOP_REPORT = top.report
