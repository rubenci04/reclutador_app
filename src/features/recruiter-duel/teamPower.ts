import type { Player } from '../../types/player'
import { coachById } from '../coaches/coachCatalog'
import { coachEffect } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { summarizeDraft } from '../draft/draftModel'
import type { MatchTeam } from '../local-match/matchTypes'
import { calculateTeamStrength, rosterAdvantage } from '../local-match/simulator'
import { composeStrength, squadQuality, type SquadQuality } from '../local-match/squadQuality'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { budgetOf } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

export interface TeamPower {
  /** Strength of the eleven alone. */
  readonly base: { readonly global: number; readonly attack: number; readonly defense: number; readonly midfield: number }
  /** What the coach adds to each sector (zeros without coach). */
  readonly coachBonus: { readonly attack: number; readonly defense: number; readonly midfield: number }
  /** Initial sectors: eleven + quality + comparative roster bonus + coach; tactics vary by block. */
  readonly total: { readonly global: number; readonly attack: number; readonly defense: number; readonly midfield: number }
  readonly averageRating: number
  readonly tier: string
  readonly coach: Coach | null
  readonly quality: SquadQuality
  readonly rosterBonus: number
}

/** Initial power of the current eleven using the simulator composition. Null while the eleven is incomplete. */
export function teamPower(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): TeamPower | null {
  const team = game.teams[participant]
  const summary = summarizeDraft(team.lineup, catalog, budgetOf(game))
  if (summary.selectedCount !== 11 || summary.averageRating === null) return null
  const match: MatchTeam = { lineup: team.lineup, players: summary.selectedPlayers, spent: summary.spent, averageRating: summary.averageRating }
  const base = calculateTeamStrength(match)
  const coach = coachById(team.coachId) ?? null
  const bonus = coach ? coachEffect(coach, game.strategies?.[participant] ?? 'NEUTRAL') : { attack: 0, defense: 0, midfield: 0 }
  const quality = squadQuality(match.players)
  const rival = summarizeDraft(game.teams[participant === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'].lineup, catalog, budgetOf(game))
  const rivalStrength = rival.selectedCount === 11 && rival.averageRating !== null ? calculateTeamStrength({ lineup: game.teams[participant === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'].lineup, players: rival.selectedPlayers, spent: rival.spent, averageRating: rival.averageRating }) : null
  const advantage = rivalStrength ? rosterAdvantage(base.global, rivalStrength.global) : null
  const rosterBonus = advantage?.side === 'local' ? advantage.bonus : 0
  return { base, coachBonus: bonus, total: composeStrength(base, quality.bonus + rosterBonus, bonus), averageRating: summary.averageRating, tier: getPlayerTier(summary.averageRating), coach, quality, rosterBonus }
}
