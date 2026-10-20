import type { Player } from '../../types/player'
import type { DraftLineup } from '../draft/draftTypes'
import { createSeededRandom } from '../local-match/seededRandom'
import { STRATEGY_IDS, type StrategyId } from './strategies'
import { ratingQuality, tacticalFeatures, type TacticalFeatures } from './tacticalModel'

const NEUTRAL_FIT = .3
const BASE_WEIGHT = .15

/** How well the squad fits each strategy, in [0, 1], from its own features only. */
export function strategyFit(features: TacticalFeatures): Readonly<Record<StrategyId, number>> {
  return {
    NEUTRAL: NEUTRAL_FIT,
    MIDFIELD_CONTROL: ratingQuality(features.midfieldControl),
    WIDE_PLAY: ratingQuality(features.flankThreat),
    COUNTER_ATTACK: ratingQuality(features.transitionThreat),
    HIGH_PRESS: ratingQuality(features.stamina),
    LOW_BLOCK: ratingQuality(features.centralDefense),
  }
}

/**
 * CPU strategy, fixed from its own organised eleven and a seed. The signature deliberately has no access to the
 * human's strategy, so the choice is made before (and without) knowing it. The seeded draw is separate from the match seed.
 */
export function selectCpuStrategy(lineup: DraftLineup, catalog: readonly Player[], seed: string, difficulty: 'EASY' | 'NORMAL' | 'HARD' = 'NORMAL'): StrategyId {
  const fit = strategyFit(tacticalFeatures(lineup, catalog))
  if (difficulty === 'HARD') {
    const best = Math.max(...STRATEGY_IDS.map((id) => fit[id]))
    const candidates = STRATEGY_IDS.filter((id) => fit[id] >= best - .015)
    return candidates[Math.floor(createSeededRandom(`${seed}:cpu-strategy`)() * candidates.length)]
  }
  const weights = STRATEGY_IDS.map((id) => BASE_WEIGHT + fit[id])
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = createSeededRandom(`${seed}:cpu-strategy`)() * total
  for (const [index, id] of STRATEGY_IDS.entries()) {
    roll -= weights[index]
    if (roll < 0) return id
  }
  return STRATEGY_IDS[STRATEGY_IDS.length - 1]
}
