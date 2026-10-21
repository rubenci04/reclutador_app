import type { ThemedModeDefinition } from './modeTypes'

export const THEMED_MODES: readonly ThemedModeDefinition[] = [
  { id: 'GLOBAL_CLASSIC', translationKey: 'globalClassic', rule: {} },
  { id: 'ARGENTINA_CLUBS', translationKey: 'argentinaClubs', rule: { leagueCountryCode: 'ARG' } },
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
  { id: 'ARGENTINA_CURRENT', translationKey: 'argentinaCurrent', rule: { leagueCountryCode: 'ARG', category: 'contemporary' } },
  { id: 'ARGENTINA_LEGENDS', translationKey: 'argentinaLegends', rule: { leagueCountryCode: 'ARG', category: 'legend' } },
  { id: 'BRAZIL_CURRENT', translationKey: 'brazilCurrent', rule: { leagueId: 'bra_serie_a', category: 'contemporary' } },
  { id: 'BRAZIL_LEGENDS', translationKey: 'brazilLegends', rule: { leagueId: 'bra_serie_a', category: 'legend' } },
  { id: 'SPAIN_LEAGUE', translationKey: 'spainLeague', rule: { leagueId: 'esp_la_liga', category: 'contemporary' } },
  { id: 'SPAIN_LEGENDS', translationKey: 'spainLegends', rule: { leagueId: 'esp_la_liga', category: 'legend' } },
  { id: 'ENGLAND_LEAGUE', translationKey: 'englandLeague', rule: { leagueId: 'eng_premier_league', category: 'contemporary' } },
  { id: 'ENGLAND_LEGENDS', translationKey: 'englandLegends', rule: { leagueId: 'eng_premier_league', category: 'legend' } },
  { id: 'ITALY_CURRENT', translationKey: 'italyCurrent', rule: { leagueId: 'ita_serie_a', category: 'contemporary' } },
  { id: 'ITALY_LEGENDS', translationKey: 'italyLegends', rule: { leagueId: 'ita_serie_a', category: 'legend' } },
  { id: 'SOUTH_AMERICA_CURRENT', translationKey: 'southAmericaCurrent', rule: { nationalityRegion: 'LATIN_AMERICA', category: 'contemporary' } },
  { id: 'SOUTH_AMERICA_LEGENDS', translationKey: 'southAmericaLegends', rule: { nationalityRegion: 'LATIN_AMERICA', category: 'legend' } },
  { id: 'EUROPE_CURRENT', translationKey: 'europeCurrent', rule: { nationalityRegion: 'EUROPE', category: 'contemporary' } },
  { id: 'EUROPE_LEGENDS', translationKey: 'europeLegends', rule: { nationalityRegion: 'EUROPE', category: 'legend' } },
] as const

export const CONMEBOL_ASSOCIATIONS = new Set(['ARG', 'BOL', 'BRA', 'CHI', 'COL', 'ECU', 'PAR', 'PER', 'URU', 'VEN'])
export const UEFA_ASSOCIATIONS = new Set(['AUT', 'BEL', 'BIH', 'CRO', 'DEN', 'ENG', 'ESP', 'FRA', 'GER', 'ISL', 'ITA', 'NED', 'NOR', 'POL', 'POR', 'SCO', 'SUI', 'SWE', 'SVN', 'WAL'])
