import { personKey } from './globalCollection'
import type { Player } from '../../types/player'

export interface TopResolutionRow { readonly rank: number; readonly name: string; readonly nationality: string; readonly status: 'RECONCILED' | 'MISSING' | 'AMBIGUOUS'; readonly editionId: string | null; readonly note: string | null }

/** Editorial Top-N pool: ranked people found in the catalogue first (ranking order), then the best-rated unnamed candidates as documented provisional filler. Nobody is invented. */
export function buildTopPool(rows: readonly TopResolutionRow[], byId: ReadonlyMap<string, Player>, candidates: readonly Player[], size: number) {
  const reconciled = rows.flatMap((row) => {
    const player = row.editionId ? byId.get(row.editionId) : undefined
    return player ? [player] : []
  })
  const listed = new Set(reconciled.map(personKey))
  const filler = candidates.filter((player) => { const key = personKey(player); if (listed.has(key)) return false; listed.add(key); return true }).slice(0, Math.max(0, size - reconciled.length))
  return {
    pool: [...reconciled, ...filler] as readonly Player[],
    report: {
      size: reconciled.length + filler.length,
      reconciled: reconciled.length,
      missing: rows.filter((row) => row.status !== 'RECONCILED').map((row) => ({ rank: row.rank, name: row.name, status: row.status })),
      provisional: filler.map((player) => player.id),
    },
  }
}
