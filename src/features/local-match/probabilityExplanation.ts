import { finishingChance, opportunityChances } from './probabilityModel'
import type { MatchResult } from './matchTypes'

/** Indicative probabilities from mean effective sectors, not match-win odds. */
export function probabilityExplanation(result: MatchResult) {
  const powers = result.effectiveStrengths ?? result.strengths
  const attack = opportunityChances(powers.local, powers.cpu)
  const stars = (side: 'local' | 'cpu') => result[side].players.filter((p) => p.position !== 'ARQ' && p.overall_rating >= 98).length
  return { attackLocal: Math.round(attack * 100), attackCpu: Math.round((1 - attack) * 100), finishLocal: Math.round(finishingChance(powers.local, powers.cpu, stars('local')) * 100), finishCpu: Math.round(finishingChance(powers.cpu, powers.local, stars('cpu')) * 100) }
}
