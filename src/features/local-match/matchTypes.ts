import type { Player } from '../../types/player'
import type { DraftLineup } from '../draft/draftTypes'

export const MATCH_RULES_VERSION = 'local-match-v1' as const
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
}
