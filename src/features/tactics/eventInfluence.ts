import type { MatchEventType, MatchSide } from '../local-match/matchTypes'
import type { StrategyId } from './strategies'
import type { TacticalAdjustment } from './tacticalModel'

/** Minimum adjustment, in strength points, for a strategy to be mentioned in the narration. */
export const INFLUENCE_THRESHOLD = 1

/**
 * Narration tag only: names the strategy whose adjustment in this block was large enough to plausibly shape the event.
 * It reads the already-computed adjustments, draws no random number and changes no result, score or statistic.
 * The event's `side` is the team the event is attributed to (the defender for `save` and `recovery`).
 */
export function eventInfluence(type: MatchEventType, side: MatchSide | null, strategies: Readonly<Record<MatchSide, StrategyId>>, adjustments: Readonly<Record<MatchSide, TacticalAdjustment>>): StrategyId | undefined {
  if (!side) return undefined
  const strategy = strategies[side]; const adjustment = adjustments[side]
  if (type === 'attack' || type === 'shot' || type === 'goal') {
    if (strategy === 'MIDFIELD_CONTROL') return adjustment.midfield > INFLUENCE_THRESHOLD ? strategy : undefined
    if (strategy === 'WIDE_PLAY' || strategy === 'COUNTER_ATTACK' || strategy === 'HIGH_PRESS') return adjustment.attack > INFLUENCE_THRESHOLD ? strategy : undefined
    return undefined
  }
  if (type === 'save') return strategy === 'LOW_BLOCK' && adjustment.defense > INFLUENCE_THRESHOLD ? strategy : undefined
  if (type === 'recovery') {
    if (strategy === 'LOW_BLOCK') return adjustment.defense > INFLUENCE_THRESHOLD ? strategy : undefined
    if (strategy === 'HIGH_PRESS') return adjustment.midfield > INFLUENCE_THRESHOLD ? strategy : undefined
  }
  return undefined
}
