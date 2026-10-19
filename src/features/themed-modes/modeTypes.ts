import type { PlayerCategory } from '../../types/player'

export const THEMED_MODE_IDS = [
  'GLOBAL_CLASSIC', 'ARGENTINA_CLUBS', 'ARGENTINA_NATIONALITY', 'ARGENTINA_LEAGUE', 'BRAZIL_NATIONALITY', 'BRAZIL_LEAGUE', 'SOUTH_AMERICA',
  'EUROPEAN_LEAGUE', 'DECADE_CHALLENGE', 'WORLD_CUP_EDITION', 'COPA_AMERICA_EDITION', 'LEGENDS_ONLY',
  'ARGENTINA_LEGENDS', 'ARGENTINA_CURRENT', 'BRAZIL_CURRENT', 'BRAZIL_LEGENDS', 'SPAIN_LEAGUE', 'SPAIN_LEGENDS',
  'ENGLAND_LEAGUE', 'ENGLAND_LEGENDS',
  'SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS', 'EUROPE_CURRENT', 'EUROPE_LEGENDS',
] as const
export type ThemedModeId = (typeof THEMED_MODE_IDS)[number]

export interface ModeRule {
  readonly nationalityRegion?: 'LATIN_AMERICA' | 'EUROPE'
  readonly nationality?: string
  readonly confederation?: 'CONMEBOL' | 'UEFA'
  readonly clubId?: string
  readonly leagueId?: string
  readonly leagueCountryCode?: string
  readonly leagueConfederation?: 'CONMEBOL' | 'UEFA'
  readonly careerYearRange?: readonly [number, number]
  readonly era?: string
  readonly yearRange?: readonly [number, number]
  readonly competitionId?: string
  readonly editionYear?: number
  readonly category?: PlayerCategory
}

export interface ThemedModeDefinition {
  readonly id: ThemedModeId
  readonly translationKey: string
  readonly rule: ModeRule
}

export type ModeAvailability = 'available' | 'insufficient_players' | 'over_budget' | 'metadata_pending' | 'cpu_incompatible'

export interface ModeDiagnostic {
  readonly id: ThemedModeId
  readonly eligibleCount: number
  readonly availability: ModeAvailability
  readonly missingMetadata: boolean
  readonly cpuCompatible: boolean
  readonly reason: 'ready' | 'positions' | 'budget' | 'metadata' | 'cpu'
  readonly minimumCost: number | null
}
