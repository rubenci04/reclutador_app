import type { ThemedModeId } from '../themed-modes/modeTypes'
import { COACH_CATALOG, EXTRA_COACHES } from './coachCatalog'
import type { Coach } from './coachTypes'
import { LEAGUE_COACHES, LEAGUE_EXISTING, type CoachLeague } from './leagueCoaches'
import { EUROPEAN_NATIONALITIES, LATIN_AMERICAN_ASSOCIATIONS } from '../themed-modes/nationalityRegions'

/** Reference affiliations, not assertions of employment in October 2026.
 * A coach may occur in multiple scopes, and keeps the same identity/effect.
 */
const REFERENCES: Readonly<Record<string, readonly [string, string?]>> = {
  Menotti: ['Huracán', 'FC Barcelona'], Bilardo: ['Estudiantes de La Plata', 'Argentina'],
  Sabella: ['Estudiantes de La Plata', 'Argentina'], Bianchi: ['Boca Juniors', 'Vélez Sarsfield'],
  Cruyff: ['FC Barcelona', 'Ajax'], 'del Bosque': ['Real Madrid', 'España'],
  Herrera: ['FC Barcelona', 'Inter de Milán'], Ferguson: ['Manchester United', 'Aberdeen'],
  Clough: ['Nottingham Forest', 'Derby County'], Santana: ['São Paulo', 'Brasil'],
  Zagallo: ['Botafogo', 'Brasil'], Guardiola: ['Manchester City', 'FC Barcelona'],
  Simeone: ['Atlético de Madrid', 'Racing Club'], Gallardo: ['River Plate'],
  Costas: ['Racing Club'], Úbeda: ['Boca Juniors'], Kudelka: ['Huracán'],
  Flick: ['FC Barcelona', 'Bayern München'], Arteta: ['Arsenal'], Slot: ['Liverpool'],
  Ferreira: ['Palmeiras'], Luís: ['Flamengo'], Crespo: ['São Paulo', 'Defensa y Justicia'],
  Almirón: ['Boca Juniors', 'Lanús'], Méndez: ['Vélez Sarsfield'],
  Pusineri: ['Independiente', 'Atlético Tucumán'], Soso: ["Newell's Old Boys", 'Defensa y Justicia'],
  Veira: ['San Lorenzo', 'River Plate'],
}
const ARG_ACTIVE = ['Gallardo', 'Costas', 'Úbeda', 'Heinze', 'Beccacece', 'Zielinski', 'Quinteros', 'Kudelka', 'Berti', 'Pusineri', 'Soso', 'Tevez', 'Méndez', 'Vaccari', 'Pellegrino', 'Holan']
const BRA_ACTIVE = ['Ferreira', 'Luís', 'Crespo', 'Coudet', 'Domínguez', 'Milito', 'Díaz', 'Gaúcho', 'Jardim', 'Lage', 'Menezes']
/** Current editions list coaches whose single reference club plays in that league; national-team and foreign-club coaches are left out. */
const ESP_ACTIVE = ['Simeone', 'Flick', 'Alonso', 'García Toral', 'Pellegrini', 'Valverde', 'Bordalás', 'Arrasate', 'Corberán', 'Sánchez', 'Pérez', 'González']
const ENG_ACTIVE = ['Guardiola', 'Arteta', 'Slot', 'Howe', 'Emery', 'Glasner', 'Silva', 'Maresca', 'Amorim', 'Frank', 'Iraola', 'Hürzeler', 'Farke']
const scoped = (names: readonly string[], legend: boolean) => [...COACH_CATALOG, ...EXTRA_COACHES].filter((coach) => names.includes(coach.surname) && (coach.status === 'LEGEND') === legend)

/** Existing coaches with a documented spell in Serie A or Liga MX, carrying that spell as their reference. */
const EXISTING_ELIGIBLE: readonly Coach[] = LEAGUE_EXISTING.map((entry) => {
  const coach = [...COACH_CATALOG, ...EXTRA_COACHES].find((candidate) => `${candidate.name} ${candidate.surname}` === entry.coach)
  if (!coach) throw new Error(`league_coach_missing:${entry.coach}`)
  return { ...coach, team: entry.team, teamKind: 'CLUB', secondaryTeam: undefined, league: entry.league, period: entry.period, sourceUrl: entry.sourceUrl }
})
/** Coaches who worked in that league, by edition. Eligibility is the career, never the nationality. */
export const leagueCoaches = (league: CoachLeague, legend: boolean): readonly Coach[] => [...LEAGUE_COACHES, ...EXISTING_ELIGIBLE].filter((coach) => coach.league === league && (coach.status === 'LEGEND') === legend)

/** `market` v2 (coach-market-v2) adds the league coaches and uses league-specific pools for Italy and Mexico; v1 reproduces the offers of earlier games. */
export function coachesForMode(mode?: ThemedModeId, market: 'v1' | 'v2' = 'v1'): readonly Coach[] {
  const legend = mode?.includes('LEGENDS') || mode === 'LEGENDS_ONLY'
  if (market === 'v2' && mode?.startsWith('ITALY')) return leagueCoaches('ITA', Boolean(legend))
  if (market === 'v2' && mode?.startsWith('MEXICO')) return leagueCoaches('MEX', Boolean(legend))
  const all: readonly Coach[] = market === 'v2' ? [...COACH_CATALOG, ...LEAGUE_COACHES] : COACH_CATALOG
  let pool: readonly Coach[] = all
  if (mode?.startsWith('ARGENTINA')) pool = legend ? COACH_CATALOG.filter((c) => c.status === 'LEGEND' && c.nationality === 'ARG') : scoped(ARG_ACTIVE, false)
  else if (mode?.startsWith('BRAZIL')) pool = legend ? scoped(['Santana', 'Zagallo', 'Perez (Lula)'], true) : scoped(BRA_ACTIVE, false)
  else if (mode?.startsWith('SPAIN')) pool = legend ? scoped(['Cruyff', 'del Bosque', 'Menotti', 'Herrera', 'Di Stéfano', 'Martino'], true) : scoped(ESP_ACTIVE, false)
  else if (mode?.startsWith('ENGLAND')) pool = legend ? scoped(['Ferguson', 'Clough', 'Busby'], true) : scoped(ENG_ACTIVE, false)
  else if (mode?.startsWith('SOUTH_AMERICA')) pool = all.filter((c) => LATIN_AMERICAN_ASSOCIATIONS.has(c.nationality) && (c.status === 'LEGEND') === Boolean(legend))
  else if (mode?.startsWith('EUROPE_')) pool = all.filter((c) => EUROPEAN_NATIONALITIES.has(c.nationality) && (c.status === 'LEGEND') === Boolean(legend))
  else if (legend) pool = all.filter((c) => c.status === 'LEGEND' && (c.tier === 'S' || c.tier === 'A'))
  else if (mode === 'GLOBAL_CLASSIC' || mode === 'ITALY_CURRENT' || mode === 'MEXICO_CURRENT') pool = all.filter((c) => c.status === 'ACTIVE')
  return pool.map((coach) => {
    const refs = coach.league ? undefined : REFERENCES[coach.surname]
    // In the Spanish legend edition, the Spanish affiliation is primary.
    const spanish: Readonly<Record<string, string>> = { Menotti: 'FC Barcelona', Guardiola: 'FC Barcelona', Emery: 'Sevilla', Enrique: 'FC Barcelona', Aguirre: 'Mallorca', Martino: 'FC Barcelona' }
    const english: Readonly<Record<string, string>> = { Tuchel: 'Chelsea', Pochettino: 'Tottenham Hotspur' }
    // Legend editions pick the career reference of that country; current coaches keep their single current reference.
    const team = !legend ? refs?.[0] ?? coach.team : mode?.startsWith('SPAIN') ? spanish[coach.surname] ?? refs?.[0] ?? coach.team : mode?.startsWith('ENGLAND') ? english[coach.surname] ?? refs?.[0] ?? coach.team : refs?.[0] ?? coach.team
    return { ...coach, team, teamKind: refs ? 'CLUB' : coach.teamKind, secondaryTeam: undefined }
  })
}
