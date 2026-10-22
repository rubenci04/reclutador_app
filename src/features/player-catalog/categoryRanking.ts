import { catalogForMode } from '../themed-modes/modeCatalog'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import type { Player } from '../../types/player'

export interface CategoryRanking {
  /** Editorial position of the footballer in this category, or undefined when the card is not part of it. */
  readonly rankOf: (playerId: string) => number | undefined
  readonly size: number
}

/** Argentina Actual opens with the editorial pair Paredes and Di María; the rest follows the effective OVR (ties: the league's own source order). */
const ARGENTINA_CURRENT_HEAD = ['import_arg_act_002', 'import_arg_act_001']

/**
 * The order of the category as played: regional, global and national pools are already editorial (their own ranking, then documented
 * filler); Argentina Actual re-orders by effective OVR; anything without an editorial order falls back to effective OVR with the id as tie-break.
 */
export function orderedCategory(mode: ThemedModeId, pool: readonly Player[] = catalogForMode(mode)): readonly Player[] {
  if (mode !== 'ARGENTINA_CURRENT') return pool
  const head = ARGENTINA_CURRENT_HEAD.flatMap((id) => pool.filter((player) => player.id === id))
  const position = new Map(pool.map((player, index) => [player.id, index]))
  return [...head, ...pool.filter((player) => !head.includes(player)).sort((a, b) => b.overall_rating - a.overall_rating || position.get(a.id)! - position.get(b.id)!)]
}

const cache = new Map<ThemedModeId, CategoryRanking>()
/** Built once per category; the card components only read it. */
export function categoryRanking(mode: ThemedModeId): CategoryRanking {
  const known = cache.get(mode)
  if (known) return known
  const order = orderedCategory(mode)
  const ranks = new Map(order.map((player, index) => [player.id, index + 1]))
  const ranking: CategoryRanking = { rankOf: (id) => ranks.get(id), size: order.length }
  cache.set(mode, ranking)
  return ranking
}

export interface RankBadge { readonly rank: number; readonly total: number }
/** Badge of a footballer in a category; null when it has no position there. */
export function rankBadge(mode: ThemedModeId | undefined, playerId: string): RankBadge | null {
  if (!mode) return null
  const ranking = categoryRanking(mode)
  const rank = ranking.rankOf(playerId)
  return rank === undefined ? null : { rank, total: ranking.size }
}
