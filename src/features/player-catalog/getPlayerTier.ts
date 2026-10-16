import { TIER_RULES } from '../../data/catalogRules'
import { PLAYER_TIERS, type PlayerTier } from '../../types/player'
import { assertOverallRating } from './rating'

export function getPlayerTier(overallRating: number): PlayerTier {
  assertOverallRating(overallRating)
  // D is guaranteed after validation if none of the higher tiers match.
  return PLAYER_TIERS.find((tier) => overallRating >= TIER_RULES[tier].min)!
}
