import type { Position } from './football'

export const ERAS = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'] as const
export type Era = (typeof ERAS)[number]
export const PLAYER_TIERS = ['S', 'A', 'B', 'C', 'D'] as const
export type PlayerTier = (typeof PLAYER_TIERS)[number]
export const PLAYER_CATEGORIES = ['contemporary', 'legend'] as const
export type PlayerCategory = (typeof PLAYER_CATEGORIES)[number]
export const DOMINANT_FEET = ['RIGHT', 'LEFT', 'BOTH', 'UNKNOWN'] as const
export type DominantFoot = (typeof DOMINANT_FEET)[number]
export type BatchId = `B0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | 'B10'

/** Editorial peak-period version of one footballer. Prices are integer millions. */
export interface Player {
  readonly id: string
  readonly name: string
  readonly position: Position
  readonly era: Era
  readonly category: PlayerCategory
  readonly reference_year: number
  readonly nationality: string
  readonly club_tag: string
  readonly overall_rating: number
  readonly att_rating: number
  readonly def_rating: number
  readonly phy_rating: number
  readonly men_rating: number
  readonly price: number
  /** Informational only. Omission in legacy records means UNKNOWN. */
  readonly dominantFoot?: DominantFoot
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
  | 'invalid_category' | 'invalid_reference_year' | 'era_mismatch' | 'category_year_mismatch'
  | 'category_distribution' | 'category_position_distribution' | 'batch_category'
  | 'invalid_manifest' | 'batch_state_mismatch' | 'unexpected_batch'
  | 'identity_mismatch' | 'invalid_dominant_foot'

/** Machine-readable diagnostics. UI consumers must translate codes before display. */
export interface ValidationIssue {
  readonly code: ValidationCode
  readonly index?: number
  readonly batchId?: string
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
  readonly mode: 'partial' | 'complete'
  readonly status: 'approved' | 'invalid' | 'pending'
  readonly valid: boolean
  readonly issues: readonly ValidationIssue[]
  readonly validPlayerCount: number
  readonly positionCounts: Readonly<Record<Position, number>>
  readonly tierCounts: Readonly<Record<PlayerTier, number>>
  readonly categoryCounts: Readonly<Record<PlayerCategory, number>>
  readonly categoryPositionCounts: Readonly<Record<PlayerCategory, Readonly<Record<Position, number>>>>
  readonly economy: EconomicViability
}

export interface BatchDefinition {
  readonly id: BatchId
  readonly category: PlayerCategory
  readonly expectedCount: 50
  readonly status: 'implemented' | 'pending'
}

export interface CatalogManifest {
  readonly version: 'catalog_v1'
  readonly referenceDate: '2026-10-16'
  readonly expectedTotal: 500
  readonly batches: readonly BatchDefinition[]
}
