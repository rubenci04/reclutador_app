import type { Position } from '../types/football'
import type { BatchId, PlayerCategory, PlayerTier } from '../types/player'

export const CATALOG_VERSION = 'catalog_v1' as const
export const CATALOG_SIZE = 500
export const CATALOG_REFERENCE_DATE = '2026-10-16' as const
export const CONTEMPORARY_PERIOD = { min: 2016, max: 2026 } as const
export const BATCH_SIZE = 50
export const BATCH_IDS: readonly BatchId[] = ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10']
export const DRAFT_BUDGET_MILLIONS = 100
export const INITIAL_FORMATION = '4-3-3' as const
export const TEAM_SIZE = 11
export const OVERALL_RANGE = { min: 75, max: 99 } as const
export const ATTRIBUTE_RANGE = { min: 40, max: 99 } as const
export const CHEMISTRY_BONUS_CAP = 0.15
export const POSITION_QUOTAS = { ARQ: 60, DEF: 160, MED: 150, DEL: 130 } as const satisfies Record<Position, number>
export const BATCH_POSITION_QUOTAS = { ARQ: 6, DEF: 16, MED: 15, DEL: 13 } as const satisfies Record<Position, number>
export const CATEGORY_POSITION_QUOTAS = {
  contemporary: { ARQ: 36, DEF: 96, MED: 90, DEL: 78 },
  legend: { ARQ: 24, DEF: 64, MED: 60, DEL: 52 },
} as const satisfies Record<PlayerCategory, Record<Position, number>>
export const CATEGORY_QUOTAS = { contemporary: 300, legend: 200 } as const
export const FORMATION_QUOTAS = { ARQ: 1, DEF: 4, MED: 3, DEL: 3 } as const satisfies Record<Position, number>
export const TIER_RULES = {
  S: { min: 94, max: 99, count: 60 },
  A: { min: 89, max: 93, count: 100 },
  B: { min: 84, max: 88, count: 150 },
  C: { min: 79, max: 83, count: 120 },
  D: { min: 75, max: 78, count: 70 },
} as const satisfies Record<PlayerTier, { min: number; max: number; count: number }>

/** Curated FIFA association codes, not ISO. Extend deliberately with catalog revisions. */
export const NATIONALITY_CODES = [
  'ARG', 'BRA', 'URU', 'CHI', 'COL', 'PAR', 'ECU', 'PER', 'VEN', 'MEX', 'USA', 'CAN',
  'ENG', 'SCO', 'WAL', 'NED', 'GER', 'FRA', 'ESP', 'ITA', 'POR', 'BEL', 'CRO', 'POL',
  'SWE', 'DEN', 'NOR', 'JPN', 'KOR', 'AUS', 'SEN', 'CMR', 'CIV', 'GHA', 'NGA', 'EGY', 'MAR', 'ALG',
  'SUI', 'ISL', 'CRC',
  'SVN', 'AUT', 'BIH', 'PAN', 'TUN', 'IRN',
  'KSA', 'QAT',
  'ARM', 'BUL', 'COD', 'CZE', 'GAB', 'GEO', 'GUI', 'GRE', 'HUN', 'IRL', 'MLI', 'MNE', 'NIR', 'NZL', 'ROU', 'RSA', 'SRB', 'SVK', 'TGO', 'TRI', 'TUR', 'UZB',
] as const

export const EXPECTED_PLAYER_IDS: readonly string[] = Array.from(
  { length: CATALOG_SIZE }, (_, index) => `plr_${String(index + 1).padStart(3, '0')}`,
)

export function getBatchCategory(batchId: BatchId): PlayerCategory {
  return Number(batchId.slice(1)) <= 6 ? 'contemporary' : 'legend'
}

export function getBatchPlayerIds(batchId: BatchId): readonly string[] {
  const offset = (Number(batchId.slice(1)) - 1) * BATCH_SIZE
  return EXPECTED_PLAYER_IDS.slice(offset, offset + BATCH_SIZE)
}
