import type { ThemedModeId } from './modeTypes'
import type { CategoryGroupId } from './categoryTree'

export type EmblemKind = 'globe' | 'globe-gold' | 'single-flag' | 'map'
export interface ModeVisual {
  readonly kind: EmblemKind
  readonly flags: readonly string[]
  readonly accent: string
  readonly legend: boolean
  readonly map?: 'south-america' | 'europe'
}

const SOUTH_AMERICA_FLAGS = ['ARG', 'BRA', 'URU', 'COL', 'CHI', 'PAR'] as const
const EUROPE_FLAGS = ['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR', 'NED'] as const
const TOURNAMENT_FLAGS = ['ARG', 'BRA', 'FRA', 'GER', 'ITA', 'URU'] as const
const single = (flag: string, accent: string, legend: boolean): ModeVisual => ({ kind: 'single-flag', flags: [flag], accent, legend })
const map = (name: 'south-america' | 'europe', flags: readonly string[], accent: string, legend: boolean): ModeVisual => ({ kind: 'map', map: name, flags, accent, legend })

export const MODE_VISUALS: Readonly<Record<ThemedModeId, ModeVisual>> = {
  GLOBAL_CLASSIC: { kind: 'globe', flags: [], accent: '#00f5d4', legend: false },
  LEGENDS_ONLY: { kind: 'globe-gold', flags: [], accent: '#fbbf24', legend: true },
  ARGENTINA_CLUBS: single('ARG', '#74acdf', false), ARGENTINA_CURRENT: single('ARG', '#74acdf', false), ARGENTINA_LEGENDS: single('ARG', '#74acdf', true),
  ARGENTINA_NATIONALITY: single('ARG', '#74acdf', false), ARGENTINA_LEAGUE: single('ARG', '#74acdf', false),
  BRAZIL_CURRENT: single('BRA', '#ffdf00', false), BRAZIL_LEGENDS: single('BRA', '#ffdf00', true), BRAZIL_NATIONALITY: single('BRA', '#ffdf00', false), BRAZIL_LEAGUE: single('BRA', '#ffdf00', false),
  SPAIN_LEAGUE: single('ESP', '#ffc400', false), SPAIN_LEGENDS: single('ESP', '#ffc400', true),
  ENGLAND_LEAGUE: single('ENG', '#ce1124', false), ENGLAND_LEGENDS: single('ENG', '#ce1124', true),
  ITALY_CURRENT: single('ITA', '#009246', false), ITALY_LEGENDS: single('ITA', '#009246', true),
  MEXICO_CURRENT: single('MEX', '#006847', false), MEXICO_LEGENDS: single('MEX', '#006847', true),
  SOUTH_AMERICA: map('south-america', SOUTH_AMERICA_FLAGS, '#fbbf24', false), SOUTH_AMERICA_CURRENT: map('south-america', SOUTH_AMERICA_FLAGS, '#fbbf24', false), SOUTH_AMERICA_LEGENDS: map('south-america', SOUTH_AMERICA_FLAGS, '#fbbf24', true),
  COPA_AMERICA_EDITION: map('south-america', SOUTH_AMERICA_FLAGS, '#fbbf24', false),
  EUROPE_CURRENT: map('europe', EUROPE_FLAGS, '#2563eb', false), EUROPE_LEGENDS: map('europe', EUROPE_FLAGS, '#2563eb', true), EUROPEAN_LEAGUE: map('europe', EUROPE_FLAGS, '#2563eb', false),
  WORLD_CUP_EDITION: { kind: 'globe', flags: TOURNAMENT_FLAGS, accent: '#d97706', legend: false }, DECADE_CHALLENGE: { kind: 'globe', flags: TOURNAMENT_FLAGS, accent: '#d97706', legend: false },
}

const GROUP_MODE: Readonly<Record<CategoryGroupId, ThemedModeId>> = {
  global: 'GLOBAL_CLASSIC', argentina: 'ARGENTINA_CURRENT', england: 'ENGLAND_LEAGUE', spain: 'SPAIN_LEAGUE', italy: 'ITALY_CURRENT', mexico: 'MEXICO_CURRENT', brazil: 'BRAZIL_CURRENT', latinAmerica: 'SOUTH_AMERICA_CURRENT', europe: 'EUROPE_CURRENT',
}
export const groupVisual = (id: CategoryGroupId): ModeVisual => MODE_VISUALS[GROUP_MODE[id]]
