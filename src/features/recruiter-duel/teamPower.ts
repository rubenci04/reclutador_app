import type { Player } from '../../types/player'
import { coachById } from '../coaches/coachCatalog'
import { coachEffect } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { summarizeDraft } from '../draft/draftModel'
import type { MatchTeam } from '../local-match/matchTypes'
import { calculateTeamStrength } from '../local-match/simulator'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { budgetOf } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

export interface TeamPower {
  /** Strength of the eleven alone. */
  readonly base: { readonly global: number; readonly attack: number; readonly defense: number; readonly midfield: number }
  /** What the coach adds to each sector (zeros without coach). */
  readonly coachBonus: { readonly attack: number; readonly defense: number; readonly midfield: number }
  /** Sectors and global power the match will use: eleven + coach. */
  readonly total: { readonly global: number; readonly attack: number; readonly defense: number; readonly midfield: number }
  readonly averageRating: number
  readonly tier: string
  readonly coach: Coach | null
}

const round1 = (value: number) => Math.round(value * 10) / 10

/** Power of the current eleven of a recruiter, the same numbers the simulator uses, plus the coach. Null while the eleven is incomplete. */
export function teamPower(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): TeamPower | null {
  const team = game.teams[participant]
  const summary = summarizeDraft(team.lineup, catalog, budgetOf(game))
  if (summary.selectedCount !== 11 || summary.averageRating === null) return null
  const match: MatchTeam = { lineup: team.lineup, players: summary.selectedPlayers, spent: summary.spent, averageRating: summary.averageRating }
  const base = calculateTeamStrength(match)
  const coach = coachById(team.coachId) ?? null
  const bonus = coach ? coachEffect(coach) : { attack: 0, defense: 0, midfield: 0 }
  const sectors = { attack: base.attack + bonus.attack, defense: base.defense + bonus.defense, midfield: base.midfield + bonus.midfield }
  return { base, coachBonus: bonus, total: { ...sectors, global: round1((sectors.attack + sectors.defense + sectors.midfield) / 3) }, averageRating: summary.averageRating, tier: getPlayerTier(summary.averageRating), coach }
}
