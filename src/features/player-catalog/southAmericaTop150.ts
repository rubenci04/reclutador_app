import resolution from '../../data/league-collections/southAmericaTop150Resolution.json'
import { ALL_CURRENT, MASTER_CATALOG, personKey } from './globalCollection'
import type { Player } from '../../types/player'

/** Playable-collection size of Sudamérica + México Actualidad (south-america-mexico-top-150-v1). */
export const SOUTH_AMERICA_TOP_SIZE = 150
export const SOUTH_AMERICA_TOP_VERSION: string = resolution.version
/** The eleven associations of the ranking; Central America and the Caribbean are not included. */
export const SOUTH_AMERICA_MEXICO_NATIONALITIES: ReadonlySet<string> = new Set(['ARG', 'BOL', 'BRA', 'CHI', 'COL', 'ECU', 'PAR', 'PER', 'URU', 'VEN', 'MEX'])
export const SOUTH_AMERICA_TOP_RESOLUTION = resolution.rows as readonly { readonly rank: number; readonly name: string; readonly nationality: string; readonly status: 'RECONCILED' | 'MISSING' | 'AMBIGUOUS'; readonly editionId: string | null; readonly note: string | null }[]

const byId = new Map(MASTER_CATALOG.map((player) => [player.id, player]))
/** Editorial Top 150 people found in the master catalogue, in ranking order (one 2026 edition each). */
const reconciled: readonly Player[] = SOUTH_AMERICA_TOP_RESOLUTION.flatMap((row) => {
  const player = row.editionId ? byId.get(row.editionId) : undefined
  return player ? [player] : []
})
const listed = new Set(reconciled.map(personKey))
/** Provisional filler: best-rated South American / Mexican identities of a 2026 edition that the ranking does not name. Nobody is invented; the shortfall is documented. */
const filler: readonly Player[] = ALL_CURRENT.filter((player) => SOUTH_AMERICA_MEXICO_NATIONALITIES.has(player.nationality) && player.reference_year === 2026 && !listed.has(personKey(player))).slice(0, Math.max(0, SOUTH_AMERICA_TOP_SIZE - reconciled.length))

export const SOUTH_AMERICA_CURRENT_POOL: readonly Player[] = [...reconciled, ...filler]
export const SOUTH_AMERICA_TOP_REPORT = {
  size: SOUTH_AMERICA_CURRENT_POOL.length,
  reconciled: reconciled.length,
  missing: SOUTH_AMERICA_TOP_RESOLUTION.filter((row) => row.status !== 'RECONCILED').map((row) => ({ rank: row.rank, name: row.name, status: row.status })),
  provisional: filler.map((player) => player.id),
} as const
