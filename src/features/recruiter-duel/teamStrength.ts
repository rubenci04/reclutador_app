import type { Player } from '../../types/player'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { teamPower } from './teamPower'

/** `global`: full eleven (same figure as the power panel). `average`: provisional mean rating of the starters signed so far. */
export interface TeamStrength { readonly kind: 'global' | 'average' | 'none'; readonly value: number; readonly count: number }

export function teamStrengthPreview(game: RecruiterDuelGame, participant: RecruiterId, catalog: readonly Player[]): TeamStrength {
  const players = Object.values(game.teams[participant].lineup).map((id) => catalog.find((player) => player.id === id)).filter((player): player is Player => Boolean(player))
  if (!players.length) return { kind: 'none', value: 0, count: 0 }
  const power = players.length === 11 ? teamPower(game, participant, catalog) : null
  if (power) return { kind: 'global', value: power.total.global, count: players.length }
  return { kind: 'average', value: players.reduce((sum, player) => sum + player.overall_rating, 0) / players.length, count: players.length }
}
