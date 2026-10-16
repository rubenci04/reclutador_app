import type { Position } from './football'

export const ERAS = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'] as const
export type Era = (typeof ERAS)[number]
export const PLAYER_TIERS = ['S', 'A', 'B', 'C', 'D'] as const
export type PlayerTier = (typeof PLAYER_TIERS)[number]

/** Editorial peak-period version of one footballer. Prices are integer millions. */
export interface Player {
  readonly id: string
  readonly name: string
  readonly position: Position
  readonly era: Era
  readonly nationality: string
  readonly club_tag: string
  readonly overall_rating: number
  readonly att_rating: number
  readonly def_rating: number
  readonly phy_rating: number
  readonly men_rating: number
  readonly price: number
}

export interface PlayerCatalog {
  readonly version: 'catalog_v1'
  readonly players: readonly Player[]
}

/** Inputs for a future chemistry engine, not a bonus calculation. */
export type ChemistryIdentity = Pick<Player, 'id' | 'nationality' | 'club_tag' | 'era'>
export type ChemistryDimension = 'nationality' | 'club_tag' | 'era'

export type ValidationCode =
  | 'invalid_record' | 'missing_field' | 'empty_text' | 'invalid_id'
  | 'invalid_position' | 'invalid_era' | 'invalid_nationality' | 'invalid_club_tag'
  | 'invalid_number' | 'price_mismatch' | 'invalid_catalog' | 'invalid_version'
  | 'invalid_count' | 'duplicate_id' | 'missing_id' | 'duplicate_player'
  | 'position_distribution' | 'tier_distribution' | 'budget_exceeded' | 'insufficient_positions'

/** Machine-readable diagnostics. UI consumers must translate codes before display. */
export interface ValidationIssue {
  readonly code: ValidationCode
  readonly index?: number
  readonly field?: string
  readonly expected?: string | number
  readonly actual?: unknown
}

export type PlayerValidation =
  | { readonly valid: true; readonly player: Player; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] }

export interface EconomicViability {
  readonly status: 'feasible' | 'over_budget' | 'insufficient_players' | 'not_evaluated'
  readonly minimumCost: number | null
  readonly playerIds: readonly string[]
}

export interface CatalogValidation {
  readonly valid: boolean
  readonly issues: readonly ValidationIssue[]
  readonly validPlayerCount: number
  readonly positionCounts: Readonly<Record<Position, number>>
  readonly tierCounts: Readonly<Record<PlayerTier, number>>
  readonly economy: EconomicViability
}
