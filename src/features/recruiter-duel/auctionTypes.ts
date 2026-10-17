import type { Player } from '../../types/player'
import type { DraftLineup, DraftSlotId } from '../draft/draftTypes'
import type { MatchResult } from '../local-match/matchTypes'

export const RECRUITERS = ['recruiter_one', 'recruiter_two'] as const
export type RecruiterId = (typeof RECRUITERS)[number]
export type AuctionPhase = 'LOBBY' | 'COIN_TOSS' | 'REVEAL_PAIR' | 'BIDDING' | 'ROUND_RESULT' | 'NEXT_ROUND' | 'TEAMS_COMPLETED' | 'SIMULATING' | 'MATCH_RESULT'

export interface AuctionPair {
  readonly slotId: DraftSlotId
  readonly position: Player['position']
  readonly primaryId: string
  readonly alternateId: string
}

export interface RecruiterTeam {
  readonly lineup: DraftLineup
  readonly spent: number
}

export interface AuctionBid { readonly participant: RecruiterId; readonly amount: number }

export type AuctionRecord =
  | { readonly type: 'coin_toss'; readonly winner: RecruiterId }
  | { readonly type: 'bid'; readonly round: number; readonly participant: RecruiterId; readonly amount: number }
  | { readonly type: 'pass'; readonly round: number; readonly participant: RecruiterId }
  | { readonly type: 'award'; readonly round: number; readonly primaryWinner: RecruiterId; readonly primaryPrice: number; readonly alternateWinner: RecruiterId; readonly alternatePrice: number }

export interface RoundAward {
  readonly primaryWinner: RecruiterId
  readonly primaryPrice: number
  readonly alternateWinner: RecruiterId
  readonly alternatePrice: number
}

export interface RecruiterDuelGame {
  readonly seed: string
  readonly phase: AuctionPhase
  readonly pairs: readonly AuctionPair[]
  readonly roundIndex: number
  readonly coinTossWinner: RecruiterId
  readonly openingOrder: readonly RecruiterId[]
  readonly teams: Readonly<Record<RecruiterId, RecruiterTeam>>
  readonly activeParticipant: RecruiterId | null
  readonly currentBid: AuctionBid | null
  readonly lastAward: RoundAward | null
  readonly record: readonly AuctionRecord[]
  readonly matchResult: MatchResult | null
}

export type AuctionCreation =
  | { readonly ok: true; readonly game: RecruiterDuelGame }
  | { readonly ok: false; readonly error: 'auction_pool_unavailable' }

export type AuctionActionError =
  | 'invalid_transition' | 'not_your_turn' | 'invalid_bid' | 'unsafe_bid' | 'invalid_award' | 'teams_invalid'

export type AuctionTransition =
  | { readonly ok: true; readonly game: RecruiterDuelGame }
  | { readonly ok: false; readonly error: AuctionActionError }
