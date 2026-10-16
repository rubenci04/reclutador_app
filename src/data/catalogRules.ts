import type { Position } from '../types/football'
import type { PlayerTier } from '../types/player'

export const CATALOG_VERSION = 'catalog_v1' as const
export const CATALOG_SIZE = 100
export const DRAFT_BUDGET_MILLIONS = 100
export const INITIAL_FORMATION = '4-3-3' as const
export const TEAM_SIZE = 11
export const OVERALL_RANGE = { min: 75, max: 99 } as const
export const ATTRIBUTE_RANGE = { min: 40, max: 99 } as const
export const CHEMISTRY_BONUS_CAP = 0.15
export const POSITION_QUOTAS = { ARQ: 12, DEF: 32, MED: 30, DEL: 26 } as const satisfies Record<Position, number>
export const FORMATION_QUOTAS = { ARQ: 1, DEF: 4, MED: 3, DEL: 3 } as const satisfies Record<Position, number>
export const TIER_RULES = {
  S: { min: 94, max: 99, count: 12 },
  A: { min: 89, max: 93, count: 20 },
  B: { min: 84, max: 88, count: 30 },
  C: { min: 79, max: 83, count: 24 },
  D: { min: 75, max: 78, count: 14 },
} as const satisfies Record<PlayerTier, { min: number; max: number; count: number }>

/** Curated FIFA association codes, not ISO. Extend deliberately with catalog revisions. */
export const NATIONALITY_CODES = [
  'ARG', 'BRA', 'URU', 'CHI', 'COL', 'PAR', 'ECU', 'PER', 'VEN', 'MEX', 'USA', 'CAN',
  'ENG', 'SCO', 'WAL', 'NED', 'GER', 'FRA', 'ESP', 'ITA', 'POR', 'BEL', 'CRO', 'POL',
  'SWE', 'DEN', 'NOR', 'JPN', 'KOR', 'AUS', 'SEN', 'CMR', 'CIV', 'GHA', 'NGA', 'EGY', 'MAR', 'ALG',
] as const

export const EXPECTED_PLAYER_IDS: readonly string[] = Array.from(
  { length: CATALOG_SIZE }, (_, index) => `plr_${String(index + 1).padStart(3, '0')}`,
)
