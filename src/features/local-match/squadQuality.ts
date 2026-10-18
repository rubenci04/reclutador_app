import type { Player } from '../../types/player'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import type { TeamStrength } from './matchTypes'

export const SQUAD_QUALITY_VERSION = 'squad-quality-v1' as const
export const SQUAD_TIERS = ['S+', 'S', 'A', 'B', 'C', 'D'] as const
export type SquadTier = (typeof SQUAD_TIERS)[number]
/** S+ is a simulation distinction at 98–99; catalog tiers and prices remain unchanged. */
export const squadTier = (player: Pick<Player, 'overall_rating'>): SquadTier => player.overall_rating >= 98 ? 'S+' : getPlayerTier(player.overall_rating)
const CONTRIBUTION: Readonly<Record<SquadTier, number>> = { 'S+': .6, S: .4, A: .2, B: .08, C: .02, D: 0 }
export const QUALITY_BONUS_CAP = 3
export interface SquadQuality { readonly counts: Readonly<Record<SquadTier, number>>; readonly bonus: number }
/** Only the eleven on the pitch counts; there is no nationality, era or spending bonus. */
export function squadQuality(players: readonly Player[]): SquadQuality {
  const counts: Record<SquadTier, number> = { 'S+': 0, S: 0, A: 0, B: 0, C: 0, D: 0 }
  for (const player of players) counts[squadTier(player)]++
  const bonus = Math.min(QUALITY_BONUS_CAP, SQUAD_TIERS.reduce((sum, tier) => sum + counts[tier] * CONTRIBUTION[tier], 0))
  return { counts, bonus: Math.round(bonus * 100) / 100 }
}

/** Shared by the power panel and match blocks, preventing bonuses being counted differently. */
export function composeStrength(base: TeamStrength, uniformBonus: number, coach: { readonly attack: number; readonly defense: number; readonly midfield: number }, tactic = { attack: 0, defense: 0, midfield: 0 }): TeamStrength {
  const attack = base.attack + uniformBonus + coach.attack + tactic.attack
  const defense = base.defense + uniformBonus + coach.defense + tactic.defense
  const midfield = base.midfield + uniformBonus + coach.midfield + tactic.midfield
  return { attack, defense, midfield, global: Math.round((attack + defense + midfield) / 3 * 10) / 10 }
}
