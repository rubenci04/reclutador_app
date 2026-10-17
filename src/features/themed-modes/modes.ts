import type { ThemedModeDefinition } from './modeTypes'

export const THEMED_MODES: readonly ThemedModeDefinition[] = [
  { id: 'GLOBAL_CLASSIC', translationKey: 'globalClassic', rule: {} },
  { id: 'ARGENTINA_NATIONALITY', translationKey: 'argentinaNationality', rule: { nationality: 'ARG' } },
  { id: 'ARGENTINA_LEAGUE', translationKey: 'argentinaLeague', rule: { leagueId: 'arg_primera' } },
  { id: 'BRAZIL_NATIONALITY', translationKey: 'brazilNationality', rule: { nationality: 'BRA' } },
  { id: 'BRAZIL_LEAGUE', translationKey: 'brazilLeague', rule: { leagueId: 'bra_serie_a' } },
  { id: 'SOUTH_AMERICA', translationKey: 'southAmerica', rule: { confederation: 'CONMEBOL' } },
  { id: 'EUROPEAN_LEAGUE', translationKey: 'europeanLeague', rule: { leagueConfederation: 'UEFA' } },
  { id: 'DECADE_CHALLENGE', translationKey: 'decadeChallenge', rule: { era: '1990s' } },
  { id: 'WORLD_CUP_EDITION', translationKey: 'worldCupEdition', rule: { competitionId: 'fifa_world_cup', editionYear: 1986 } },
  { id: 'COPA_AMERICA_EDITION', translationKey: 'copaAmericaEdition', rule: { competitionId: 'copa_america', editionYear: 2024 } },
  { id: 'LEGENDS_ONLY', translationKey: 'legendsOnly', rule: { category: 'legend' } },
] as const

export const CONMEBOL_ASSOCIATIONS = new Set(['ARG', 'BOL', 'BRA', 'CHI', 'COL', 'ECU', 'PAR', 'PER', 'URU', 'VEN'])
export const UEFA_ASSOCIATIONS = new Set(['AUT', 'BEL', 'BIH', 'CRO', 'DEN', 'ENG', 'ESP', 'FRA', 'GER', 'ISL', 'ITA', 'NED', 'NOR', 'POL', 'POR', 'SCO', 'SUI', 'SWE', 'SVN', 'WAL'])
