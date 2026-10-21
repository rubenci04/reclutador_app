import data from '../../data/league-coaches.json'
import { COACH_TIER_PRICE } from './coachRules'
import type { Coach, CoachFocus, CoachTier } from './coachTypes'

export const LEAGUE_COACH_VERSION: string = data.version
export type CoachLeague = 'ITA' | 'MEX'

const fromRow = (row: typeof data.new[number]): Coach => ({
  id: row.id, name: row.name, surname: row.surname, birthYear: row.birthYear, ...('deathYear' in row ? { deathYear: row.deathYear } : {}),
  team: row.team, teamKind: 'CLUB', nationality: row.nationality, status: row.status as Coach['status'], tier: row.tier as CoachTier,
  focus: row.focus as CoachFocus, price: COACH_TIER_PRICE[row.tier as CoachTier], league: row.league as CoachLeague, period: [row.period[0], row.period[1]], sourceUrl: row.sourceUrl,
})
/** Ten Serie A and ten Liga MX coaches added by COACH-006; photographs are intentionally absent (neutral portrait). */
export const LEAGUE_COACHES: readonly Coach[] = data.new.map(fromRow)

/** Existing coaches with a documented spell in the league; resolved against the catalogue by the caller (avoids a module cycle). */
export const LEAGUE_EXISTING = data.existing.map((entry) => ({ coach: entry.coach, league: entry.league as CoachLeague, team: entry.team, period: [entry.period[0], entry.period[1]] as readonly [number, number | null], sourceUrl: entry.sourceUrl }))
