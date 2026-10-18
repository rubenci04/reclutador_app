import type { Player } from '../../types/player'
import { budgetOf, currentRound, maximumSafeBid, openingPriority, positionProgress } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'

export const HUD_POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
export const SHARED_DISCARDS = 3
const TEAM_SIZE = 11

export interface HudPosition {
  readonly position: (typeof HUD_POSITIONS)[number]
  readonly filled: number
  readonly capacity: number
  readonly remaining: number
  /** The rival already completed this line, so every remaining card of it can only go to this recruiter. */
  readonly forced: boolean
}

export interface HudParticipant {
  readonly id: RecruiterId
  readonly spent: number
  /** Total budget left, not the amount that can be offered. */
  readonly remaining: number
  readonly signed: number
  readonly positions: readonly HudPosition[]
  /** Engine maximum safe bid for the current card; null when there is no card or the engine allows no bid. */
  readonly bidCeiling: number | null
  /** Budget the engine keeps back to finish both elevens: remaining minus the safe ceiling. Null when no ceiling. */
  readonly reserved: number | null
}

export interface HudModel {
  readonly budget: number
  readonly awards: number
  readonly totalAwards: number
  readonly teamSize: number
  readonly discardsRemaining: number
  readonly discardsTotal: number
  /** Active bidder, otherwise the recruiter who opens the round. */
  readonly turn: RecruiterId | null
  readonly participants: Readonly<Record<RecruiterId, HudParticipant>>
}

/** Every figure comes from the stored game or from the engine's own predicates; nothing is stored or rederived separately. */
export function buildHudModel(game: RecruiterDuelGame, catalog: readonly Player[]): HudModel {
  const bidding = game.phase === 'BIDDING' && currentRound(game) !== undefined
  const participant = (id: RecruiterId): HudParticipant => {
    const team = game.teams[id]; const rival = game.teams[id === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one']
    const remaining = budgetOf(game) - team.spent
    const minimum = game.currentBid ? game.currentBid.amount + 1 : catalog.find((player) => player.id === currentRound(game)?.playerId)?.price ?? 0
    const ceiling = bidding ? maximumSafeBid(game, id, catalog) : 0
    const hasCeiling = bidding && ceiling >= minimum
    return {
      id, spent: team.spent, remaining, signed: Object.values(team.lineup).filter(Boolean).length,
      positions: HUD_POSITIONS.map((position) => {
        const own = positionProgress(team, position)
        return { position, ...own, forced: own.remaining > 0 && positionProgress(rival, position).remaining === 0 }
      }),
      bidCeiling: hasCeiling ? ceiling : null,
      reserved: hasCeiling ? remaining - ceiling : null,
    }
  }
  return {
    budget: budgetOf(game), awards: game.record.filter((entry) => entry.type === 'award').length, totalAwards: game.rounds.length, teamSize: TEAM_SIZE,
    discardsRemaining: game.discardsRemaining, discardsTotal: SHARED_DISCARDS,
    turn: game.activeParticipant ?? openingPriority(game) ?? null,
    participants: { recruiter_one: participant('recruiter_one'), recruiter_two: participant('recruiter_two') },
  }
}

