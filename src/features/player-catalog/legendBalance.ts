import policy from '../../data/league-collections/legendBalancePolicy.json'
import type { ThemedModeId } from '../themed-modes/modeTypes'

export const LEGEND_BALANCE_VERSION: string = policy.version
export type BalancedLegendMode = keyof typeof policy.modes
export const BALANCED_LEGEND_MODES = Object.keys(policy.modes) as BalancedLegendMode[]
export const isBalancedLegendMode = (mode: ThemedModeId): mode is BalancedLegendMode => Object.hasOwn(policy.modes, mode)
const exceptionIds = new Set(policy.exceptions.map((entry) => entry.id))

interface RatedRow { readonly id: string; readonly sourceRank: number; readonly sourceRating: number }

/** Effective OVR per edition id for one legends mode (rows already restricted to that league's eligible legends). */
export function balancedRatings(mode: BalancedLegendMode, rows: readonly RatedRow[]): ReadonlyMap<string, number> {
  const { knee, cap, ratio, exceptionOvr } = policy.modes[mode]
  const ratings = new Map<string, number>()
  const ordered = [...rows].sort((a, b) => b.sourceRating - a.sourceRating || a.sourceRank - b.sourceRank)
  const above: RatedRow[] = []
  for (const row of ordered) {
    const floor = Math.max(75, Math.min(99, row.sourceRating))
    if (exceptionOvr !== null && exceptionIds.has(row.id)) ratings.set(row.id, Math.min(floor, exceptionOvr))
    else if (floor <= knee) ratings.set(row.id, floor)
    else above.push(row)
  }
  const slots = cap - knee
  const weights = Array.from({ length: slots }, (_, index) => ratio ** index)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor = 0, assigned = 0
  weights.forEach((weight, index) => {
    const value = cap - index
    const count = index === slots - 1 ? above.length - assigned : Math.round(above.length * weight / total)
    for (const row of above.slice(cursor, cursor + count)) ratings.set(row.id, Math.min(value, Math.max(75, Math.min(99, row.sourceRating))))
    cursor += count; assigned += count
  })
  return ratings
}
