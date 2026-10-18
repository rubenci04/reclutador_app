import type { Player } from '../../types/player'
import type { DraftLineup } from '../draft/draftTypes'
import type { MatchResult } from '../local-match/matchTypes'
import type { StrategyId } from '../tactics/strategies'
import type { MatchConfig } from './matchConfig'
import type { DrawContext } from './drawHistory'

export const RECRUITERS = ['recruiter_one', 'recruiter_two'] as const
export type RecruiterId = (typeof RECRUITERS)[number]
export type CoinSide = 'heads' | 'tails'
export type AwardReason = 'voluntary_bid' | 'double_pass_priority' | 'forced_viability' | 'auto_complete'
export type AuctionPhase = 'LOBBY' | 'COIN_TOSS' | 'REVEAL_PLAYER' | 'BIDDING' | 'DISCARD_RESULT' | 'ROUND_RESULT' | 'NEXT_ROUND' | 'TEAMS_COMPLETED' | 'SIMULATING' | 'MATCH_RESULT'

/** A single card offered during one auction round. */
export interface AuctionRound {
  readonly position: Player['position']
  readonly playerId: string
}

/** A substitute place, fixed to a general position. Present only when the match has substitutes. */
export interface BenchSlot { readonly position: Player['position']; readonly playerId: string | null }

export interface RecruiterTeam {
  readonly lineup: DraftLineup
  readonly spent: number
  readonly bench?: readonly BenchSlot[]
  /** Coach hired after the auctions with the money left. Absent when the match has no coaches or none was hired. */
  readonly coachId?: string
}

export interface AuctionBid { readonly participant: RecruiterId; readonly amount: number }

export type AuctionRecord =
  | { readonly type: 'discard'; readonly round: number; readonly playerId: string; readonly replacementId: string }
  | { readonly type: 'coin_toss'; readonly calledSide: CoinSide; readonly result: CoinSide; readonly winner: RecruiterId }
  | { readonly type: 'bid'; readonly round: number; readonly participant: RecruiterId; readonly amount: number }
  | { readonly type: 'pass'; readonly round: number; readonly participant: RecruiterId }
  | { readonly type: 'award'; readonly round: number; readonly winner: RecruiterId; readonly playerId: string; readonly price: number; readonly reason: AwardReason }
  | { readonly type: 'cpu_decision'; readonly round: number; readonly playerId: string; readonly action: 'bid' | 'pass'; readonly amount?: number; readonly reason: string; readonly strategy: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'; readonly privateMaximum: number }

export interface RoundAward {
  readonly reason: AwardReason
  readonly winner: RecruiterId
  readonly playerId: string
  readonly price: number
}

export interface RecruiterDuelGame {
  readonly seed: string
  readonly drawContext?: DrawContext
  readonly drawDiagnostics?: { readonly attempts: number; readonly relaxation: number; readonly smallPoolPositions: readonly Player['position'][] }
  readonly phase: AuctionPhase
  readonly rounds: readonly AuctionRound[]
  readonly roundIndex: number
  readonly discardsRemaining: number
  readonly discardedPlayerIds: readonly string[]
  readonly lastDiscard: { readonly playerId: string; readonly replacementId: string } | null
  readonly coinCall: CoinSide | null
  readonly coinResult: CoinSide | null
  readonly coinTossWinner: RecruiterId | null
  readonly openingOrder: readonly RecruiterId[]
  readonly teams: Readonly<Record<RecruiterId, RecruiterTeam>>
  readonly activeParticipant: RecruiterId | null
  readonly currentBid: AuctionBid | null
  readonly passedParticipants: readonly RecruiterId[]
  readonly lastAward: RoundAward | null
  readonly record: readonly AuctionRecord[]
  readonly matchResult: MatchResult | null
  /** Strategies used for the match, stored with the game. Absent in games created before tactics (NEUTRAL). */
  readonly strategies?: Readonly<Record<RecruiterId, StrategyId>>
  /** Absent in games created before configuration existed (classic rules). */
  readonly config?: MatchConfig
}

export type AuctionCreation =
  | { readonly ok: true; readonly game: RecruiterDuelGame }
  | { readonly ok: false; readonly error: 'auction_pool_unavailable' | 'budget_too_low' | 'budget_range' }

export type AuctionActionError =
  | 'invalid_transition' | 'not_your_turn' | 'invalid_bid' | 'unsafe_bid' | 'invalid_award' | 'teams_invalid' | 'no_legal_assignment' | 'invalid_strategy' | 'rival_incomplete' | 'invalid_substitute' | 'invalid_coach'

export type AuctionTransition =
  | { readonly ok: true; readonly game: RecruiterDuelGame }
  | { readonly ok: false; readonly error: AuctionActionError }
