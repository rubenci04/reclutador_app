import type { Player } from '../../types/player'
import type { DraftLineup } from '../draft/draftTypes'
import type { StrategyId, TACTICS_VERSION } from '../tactics/strategies'
import type { TacticalAdjustment } from '../tactics/tacticalModel'

export const MATCH_RULES_VERSION = 'local-match-v2' as const
export const MATCH_MINUTES = [15, 30, 45, 60, 75, 90] as const
export type MatchSide = 'local' | 'cpu'
export type MatchEventType = 'attack' | 'shot' | 'save' | 'recovery' | 'goal' | 'final'

export interface MatchTeam {
  readonly lineup: DraftLineup
  readonly players: readonly Player[]
  readonly spent: number
  readonly averageRating: number
}

export interface TeamStrength {
  readonly global: number
  readonly attack: number
  readonly defense: number
  readonly midfield: number
}

export interface MatchStats {
  readonly shots: number
  readonly shotsOnTarget: number
  readonly saves: number
  readonly recoveries: number
  readonly possession: number
}

export interface MatchEvent {
  readonly minute: (typeof MATCH_MINUTES)[number]
  readonly side: MatchSide | null
  readonly type: MatchEventType
  readonly playerId?: string
}

export interface MatchBlock {
  readonly minute: (typeof MATCH_MINUTES)[number]
  readonly events: readonly MatchEvent[]
  readonly score: Readonly<Record<MatchSide, number>>
}

/** Tactical layer outcome. Absent in results stored before tactics existed, which count as NEUTRAL vs NEUTRAL. */
export interface TacticalSummary {
  readonly version: typeof TACTICS_VERSION
  readonly selection: Readonly<Record<MatchSide, StrategyId>>
  /** Mean adjustment applied over the six blocks, in strength points, rounded to two decimals. */
  readonly adjustments: Readonly<Record<MatchSide, TacticalAdjustment>>
}

export interface MatchResult {
  readonly catalogVersion: 'catalog_v1'
  readonly rulesVersion: typeof MATCH_RULES_VERSION
  readonly seed: string
  readonly local: MatchTeam
  readonly cpu: MatchTeam
  readonly strengths: Readonly<Record<MatchSide, TeamStrength>>
  readonly stats: Readonly<Record<MatchSide, MatchStats>>
  readonly blocks: readonly MatchBlock[]
  readonly score: Readonly<Record<MatchSide, number>>
  readonly winner: MatchSide | 'draw'
  readonly tactics?: TacticalSummary
}
