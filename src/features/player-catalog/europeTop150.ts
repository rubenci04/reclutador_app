import resolution from '../../data/league-collections/europeTop150Resolution.json'
import { ALL_CURRENT, personKey } from './globalCollection'
import { EUROPEAN_NATIONALITIES } from '../themed-modes/nationalityRegions'
import type { Player } from '../../types/player'

/** Playable-collection size of Europe Actualidad (europe-top-150-v1). */
export const EUROPE_TOP_SIZE = 150
export const EUROPE_TOP_VERSION: string = resolution.version
export type EuropeRowStatus = 'RECONCILED' | 'MISSING' | 'AMBIGUOUS'
export const EUROPE_TOP_RESOLUTION = resolution.rows as readonly { readonly rank: number; readonly name: string; readonly nationality: string; readonly status: EuropeRowStatus; readonly editionId: string | null; readonly note: string | null }[]

const byId = new Map(ALL_CURRENT.map((player) => [player.id, player]))
/** Editorial Top 150 people found in the master catalogue, in ranking order (one 2026 edition each, no historical editions). */
const reconciled: readonly Player[] = EUROPE_TOP_RESOLUTION.flatMap((row) => {
  const player = row.editionId ? byId.get(row.editionId) : undefined
  return player ? [player] : []
})
const listed = new Set(reconciled.map(personKey))
/** Provisional filler: best-rated European identities of a 2026 edition (older reference editions of former stars are not 2026 candidates) that the ranking does not name. Nobody is invented; the shortfall is documented. */
const filler: readonly Player[] = ALL_CURRENT.filter((player) => EUROPEAN_NATIONALITIES.has(player.nationality) && player.reference_year === 2026 && !listed.has(personKey(player))).slice(0, Math.max(0, EUROPE_TOP_SIZE - reconciled.length))

export const EUROPE_CURRENT_POOL: readonly Player[] = [...reconciled, ...filler]
export const EUROPE_TOP_REPORT = {
  size: EUROPE_CURRENT_POOL.length,
  reconciled: reconciled.length,
  missing: EUROPE_TOP_RESOLUTION.filter((row) => row.status !== 'RECONCILED').map((row) => ({ rank: row.rank, name: row.name, status: row.status })),
  provisional: filler.map((player) => player.id),
} as const
