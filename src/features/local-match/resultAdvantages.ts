import type { MatchResult, MatchSide } from './matchTypes'
import { SQUAD_TIERS } from './squadQuality'

export type AdvantageKey = 'power' | 'attack' | 'midfield' | 'defense' | 'stars' | 'coach' | 'possession' | 'shots'
const TIER_WEIGHT: Readonly<Record<string, number>> = { 'S+': 5, S: 4, A: 3, B: 2, C: 1, D: 0 }

/**
 * What each side had going for it, read only from the stored result. Differences below the stated thresholds are not mentioned. This lists
 * inputs and what happened on the pitch; it never claims they caused the score (opportunities, decisions and seeded chance also decide it).
 */
export function resultAdvantages(result: MatchResult): Readonly<Record<MatchSide, readonly AdvantageKey[]>> {
  const strengths = result.effectiveStrengths ?? result.strengths
  const out: Record<MatchSide, AdvantageKey[]> = { local: [], cpu: [] }
  const lead = (key: AdvantageKey, local: number, cpu: number, threshold: number) => { if (Math.abs(local - cpu) >= threshold) out[local > cpu ? 'local' : 'cpu'].push(key) }
  lead('power', strengths.local.global, strengths.cpu.global, 1)
  lead('attack', strengths.local.attack, strengths.cpu.attack, 2)
  lead('midfield', strengths.local.midfield, strengths.cpu.midfield, 2)
  lead('defense', strengths.local.defense, strengths.cpu.defense, 2)
  if (result.quality) {
    const quality = result.quality
    const stars = (side: MatchSide) => SQUAD_TIERS.reduce((sum, tier) => sum + (TIER_WEIGHT[tier] ?? 0) * quality.initial[side].counts[tier], 0)
    lead('stars', stars('local'), stars('cpu'), 3)
  }
  const coach = (side: MatchSide) => { const c = result.coaches?.[side]; return c ? c.attack + c.defense + c.midfield : 0 }
  lead('coach', coach('local'), coach('cpu'), .5)
  lead('possession', result.stats.local.possession, result.stats.cpu.possession, 4)
  lead('shots', result.stats.local.shots, result.stats.cpu.shots, 2)
  return out
}
