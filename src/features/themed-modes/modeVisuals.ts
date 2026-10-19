import type { ThemedModeId } from './modeTypes'
import type { CategoryGroupId } from './categoryTree'

export type EmblemKind = 'globe' | 'globe-gold' | 'single-flag' | 'multi-flag'
export interface ModeVisual {
  readonly kind: EmblemKind
  readonly flags: readonly string[]
  readonly accent: string
  readonly legend: boolean
}

const SOUTH_AMERICA_FLAGS = ['ARG', 'BRA', 'URU', 'COL', 'CHI', 'PAR'] as const
const EUROPE_FLAGS = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR', 'NED'] as const
const TOURNAMENT_FLAGS = ['ARG', 'BRA', 'FRA', 'GER', 'ITA', 'URU'] as const
const single = (flag: string, accent: string, legend: boolean): ModeVisual => ({ kind: 'single-flag', flags: [flag], accent, legend })
const multi = (flags: readonly string[], accent: string, legend: boolean): ModeVisual => ({ kind: 'multi-flag', flags, accent, legend })

export const MODE_VISUALS: Readonly<Record<ThemedModeId, ModeVisual>> = {
  GLOBAL_CLASSIC: { kind: 'globe', flags: [], accent: '#00f5d4', legend: false },
  LEGENDS_ONLY: { kind: 'globe-gold', flags: [], accent: '#fbbf24', legend: true },
  ARGENTINA_CLUBS: single('ARG', '#74acdf', false), ARGENTINA_CURRENT: single('ARG', '#74acdf', false), ARGENTINA_LEGENDS: single('ARG', '#74acdf', true),
  ARGENTINA_NATIONALITY: single('ARG', '#74acdf', false), ARGENTINA_LEAGUE: single('ARG', '#74acdf', false),
  BRAZIL_CURRENT: single('BRA', '#ffdf00', false), BRAZIL_LEGENDS: single('BRA', '#ffdf00', true), BRAZIL_NATIONALITY: single('BRA', '#ffdf00', false), BRAZIL_LEAGUE: single('BRA', '#ffdf00', false),
  SPAIN_LEAGUE: single('ESP', '#ffc400', false), SPAIN_LEGENDS: single('ESP', '#ffc400', true),
  ENGLAND_LEAGUE: single('ENG', '#ce1124', false), ENGLAND_LEGENDS: single('ENG', '#ce1124', true),
  SOUTH_AMERICA: multi(SOUTH_AMERICA_FLAGS, '#fbbf24', false), SOUTH_AMERICA_CURRENT: multi(SOUTH_AMERICA_FLAGS, '#fbbf24', false), SOUTH_AMERICA_LEGENDS: multi(SOUTH_AMERICA_FLAGS, '#fbbf24', true),
  COPA_AMERICA_EDITION: multi(SOUTH_AMERICA_FLAGS, '#fbbf24', false),
  EUROPE_CURRENT: multi(EUROPE_FLAGS, '#2563eb', false), EUROPE_LEGENDS: multi(EUROPE_FLAGS, '#2563eb', true), EUROPEAN_LEAGUE: multi(EUROPE_FLAGS, '#2563eb', false),
  WORLD_CUP_EDITION: multi(TOURNAMENT_FLAGS, '#d97706', false), DECADE_CHALLENGE: multi(TOURNAMENT_FLAGS, '#d97706', false),
}

const GROUP_MODE: Readonly<Record<CategoryGroupId, ThemedModeId>> = {
  global: 'GLOBAL_CLASSIC', argentina: 'ARGENTINA_CURRENT', england: 'ENGLAND_LEAGUE', spain: 'SPAIN_LEAGUE', brazil: 'BRAZIL_CURRENT', latinAmerica: 'SOUTH_AMERICA_CURRENT', europe: 'EUROPE_CURRENT',
}
export const groupVisual = (id: CategoryGroupId): ModeVisual => MODE_VISUALS[GROUP_MODE[id]]
